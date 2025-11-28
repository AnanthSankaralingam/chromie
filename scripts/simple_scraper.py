#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import logging
import os
import time
from typing import Dict, List, Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup, Comment
from playwright.sync_api import sync_playwright, Error as PlaywrightError
from google import genai
from pydantic import BaseModel, Field
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ---------------------------
# Configuration
# ---------------------------

# Static list of websites to scrape (in addition to Supabase scraper_misses)
STATIC_WEBSITES = [
]

# Maximum HTML length to send to LLM (characters)
MAX_HTML_LENGTH = 100000

# Maximum output length in characters
MAX_OUTPUT_LENGTH = 6000

# LLM Prompt Template - Optimized for structured JSON output
COMPREHENSIVE_PROMPT_TEMPLATE = """Analyze this webpage HTML for Chrome extension development. Identify 8-12 key UI elements that extensions typically interact with.

Page: {page_title}
URL: {url}

HTML Content (sanitized):
{html_content}

For each important element, provide:
- A semantic key name (e.g., search_form, login_button, navigation_menu)
- A brief one-sentence description of its purpose
- A reliable CSS selector to target this element

Prioritize: interactive elements (buttons, forms, inputs), navigation, search, main content areas, modals, and dropdowns."""

# ---------------------------
# Pydantic Models for Structured Output
# ---------------------------

class PageElement(BaseModel):
    """Model for a single page element."""
    description: str = Field(description="One-sentence description of the element's purpose for Chrome extensions")
    selector: str = Field(description="CSS selector for the element")

class PageSummary(BaseModel):
    """Model for the complete page summary."""
    major_elements: Dict[str, PageElement] = Field(
        description="Dictionary of 8-12 important page elements with semantic key names"
    )

# ---------------------------
# Supabase Setup
# ---------------------------

def init_supabase() -> Client:
    """Initialize and return Supabase client."""
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment")
    
    return create_client(supabase_url, supabase_key)

# ---------------------------
# HTML Sanitization Functions
# ---------------------------

def sanitize_html(html_content: str) -> str:
    """
    Aggressively sanitizes HTML by removing all unnecessary elements.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove unnecessary tags
    for tag in soup.find_all(["script", "style", "noscript", "svg", "img", 
                               "video", "audio", "source", "track", "iframe", 
                               "canvas", "meta", "link"]):
        tag.decompose()
    
    # Remove comments
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()
    
    # Remove inline styles and JS handlers
    for tag in soup.find_all(True):
        if tag.has_attr("style"):
            del tag["style"]
        
        attrs_to_remove = [attr for attr in tag.attrs 
                          if attr.startswith("on") or 
                          attr.startswith("data-analytics") or 
                          attr.startswith("data-track")]
        for attr in attrs_to_remove:
            del tag[attr]
    
    sanitized = str(soup)
    logging.info(f"HTML sanitized: {len(html_content):,} → {len(sanitized):,} characters "
                f"({(1 - len(sanitized)/len(html_content))*100:.1f}% reduction)")
    
    # Truncate if too long
    if len(sanitized) > MAX_HTML_LENGTH:
        logging.warning(f"HTML too long ({len(sanitized)} chars), truncating to {MAX_HTML_LENGTH}")
        sanitized = sanitized[:MAX_HTML_LENGTH] + "\n... [truncated]"
    
    return sanitized

# ---------------------------
# Helper Functions
# ---------------------------

def domain_to_url(domain_name: str) -> str:
    """Converts a domain name to a full URL with https:// if not present."""
    domain_name = domain_name.strip()
    if not domain_name.startswith(('http://', 'https://')):
        return f"https://{domain_name}"
    return domain_name

def extract_domain_from_url(url: str) -> str:
    """Extracts clean domain name from URL."""
    parsed = urlparse(url)
    return parsed.netloc.replace("www.", "")

# ---------------------------
# Core Logic
# ---------------------------

def generate_comprehensive_summary_with_llm(
    sanitized_html: str,
    page_title: str,
    url: str
) -> Optional[dict]:
    """
    Generates a comprehensive summary using Gemini with JSON output.
    Returns summary_dict on success, None on failure.
    """
    api_key = os.getenv("GOOGLE_AI_API_KEY")
    
    if not api_key:
        logging.error("GOOGLE_AI_API_KEY not set. Cannot proceed without LLM.")
        return None

    try:
        # Initialize Gemini client
        client = genai.Client(api_key=api_key)
        
        # Build the prompt with explicit structure instructions
        prompt = f"""{COMPREHENSIVE_PROMPT_TEMPLATE.format(
            page_title=page_title,
            url=url,
            html_content=sanitized_html
        )}

CRITICAL: Return ONLY a valid JSON object with this exact structure (no other text, no markdown, no explanations):

{{
  "major_elements": {{
    "semantic_key_1": {{
      "description": "Brief one sentence description of what this element does",
      "selector": "css_selector"
    }},
    "semantic_key_2": {{
      "description": "One sentence description of what this element does",
      "selector": "css_selector"
    }}
  }}
}}

Rules:
- Identify 8-12 key interactive elements from the HTML
- Each key should be a semantic name (e.g., search_form, login_button, navigation_menu)
- Each description should be exactly one sentence
- Each selector should be a reliable CSS selector
- Output ONLY the JSON object, starting with {{ and ending with }}"""
        
        logging.info("Sending analysis request to LLM...")
        
        # Generate content in JSON mode
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.1,
                "max_output_tokens": 4096
            }
        )

        # Parse and validate
        try:
            summary = json.loads(response.text)
            
            # Validate structure
            if "major_elements" not in summary:
                logging.warning("Response missing 'major_elements', wrapping...")
                summary = {"major_elements": summary}
            
            # Validate with Pydantic
            try:
                page_summary = PageSummary.model_validate(summary)
                logging.info("✓ Pydantic validation passed")
            except Exception as pydantic_error:
                logging.error(f"Pydantic validation failed: {pydantic_error}")
                return None
            
            # Check character limit
            json_str = json.dumps(summary)
            if len(json_str) > MAX_OUTPUT_LENGTH:
                logging.error(f"LLM output exceeds limit ({len(json_str)} chars)")
                return None
            
            logging.info(f"✓ Successfully generated summary ({len(json_str)} characters, {len(summary['major_elements'])} elements)")
            return summary
            
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse JSON response: {e}")
            logging.error(f"Response text: {response.text[:500]}...")
            return None

    except Exception as e:
        logging.error(f"Google Gemini API call failed: {e}")
        return None

def generate_page_summary(url: str, source: str = "scraped") -> Optional[dict]:
    """
    Fetches a URL with Playwright and generates a Chrome extension-focused summary.
    Returns summary_dict on success, None on failure.
    """
    logging.info(f"Starting analysis for URL: {url} (source: {source})")
    
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Set viewport and user agent
            page.set_viewport_size({"width": 1920, "height": 1080})
            
            logging.info("Navigating to page...")
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait a bit for dynamic content
            page.wait_for_timeout(2000)
            
            page_title = page.title()
            html_content = page.content()
            logging.info(f"Page '{page_title}' loaded successfully.")
            
            browser.close()
        except PlaywrightError as e:
            logging.error(f"Playwright failed to load the page: {e}")
            return None

    # Sanitize HTML
    logging.info("Sanitizing HTML content...")
    sanitized_html = sanitize_html(html_content)
    
    # Generate summary with LLM
    summary = generate_comprehensive_summary_with_llm(sanitized_html, page_title, url)
    
    if summary is None:
        logging.error("Failed to generate summary")
        return None
    
    final_length = len(json.dumps(summary))
    logging.info(f"✓ Analysis complete. Final output: {final_length} characters, {len(summary['major_elements'])} elements")
    return summary

# ---------------------------
# Main Execution Block
# ---------------------------

def main():
    """
    Main function to scrape domains from static list and Supabase scraper_misses.
    """
    
    logging.basicConfig(
        level=logging.INFO, 
        format="%(asctime)s - %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Initialize Supabase client
    try:
        supabase = init_supabase()
        logging.info("✓ Connected to Supabase")
    except ValueError as e:
        logging.error(f"Failed to initialize Supabase: {e}")
        return
    
    # Collect all domains to process
    domains_to_process = []
    
    # 1. Add static websites
    for url in STATIC_WEBSITES:
        domain_name = extract_domain_from_url(url)
        domains_to_process.append({
            "domain_name": domain_name,
            "url": url,
            "source": "local",
            "count": 0
        })
    
    if STATIC_WEBSITES:
        logging.info(f"✓ Added {len(STATIC_WEBSITES)} static websites")
    
    # 2. Fetch domains from scraper_misses table
    try:
        response = supabase.table("scraper_misses").select("domain_name, count").execute()
        scraper_misses = response.data
        
        for row in scraper_misses:
            domain_name = row.get("domain_name")
            if domain_name:
                domains_to_process.append({
                    "domain_name": domain_name,
                    "url": domain_to_url(domain_name),
                    "source": "supabase",
                    "count": row.get("count", 0)
                })
        
        logging.info(f"✓ Found {len(scraper_misses)} domains in scraper_misses table")
    except Exception as e:
        logging.error(f"Failed to fetch from scraper_misses: {e}")
    
    if not domains_to_process:
        logging.info("No domains to scrape. Exiting.")
        return
    
    # Process each domain
    success_count = 0
    failed_domains: List[Dict] = []
    
    print("\n" + "=" * 80)
    print(f"STARTING SCRAPE SESSION - {len(domains_to_process)} DOMAINS TO PROCESS")
    print("=" * 80 + "\n")
    
    for idx, domain_info in enumerate(domains_to_process, 1):
        domain_name = domain_info["domain_name"]
        url = domain_info["url"]
        source_type = domain_info["source"]
        count = domain_info["count"]
        
        print("=" * 80)
        logging.info(f"[{idx}/{len(domains_to_process)}] Processing: {domain_name}")
        logging.info(f"URL: {url} | Source: {source_type} | Miss Count: {count}")
        print("=" * 80)
        
        # Scrape the page
        page_summary = generate_page_summary(url, source=source_type)
        
        if page_summary is not None:
            # Insert into scraper table
            try:
                insert_data = {
                    "domain_name": domain_name,
                    "scraper_output": page_summary,
                    "source": source_type
                }
                
                # Upsert to handle duplicates
                supabase.table("scraper").upsert(
                    insert_data,
                    on_conflict="domain_name"
                ).execute()
                
                logging.info(f"✓ Successfully saved {domain_name} to scraper table")
                
                # Delete from scraper_misses if it came from there
                if source_type == "supabase":
                    try:
                        supabase.table("scraper_misses").delete().eq("domain_name", domain_name).execute()
                        logging.info(f"✓ Removed {domain_name} from scraper_misses table")
                    except Exception as delete_error:
                        logging.warning(f"Failed to delete {domain_name} from scraper_misses: {delete_error}")
                
                success_count += 1
                
            except Exception as e:
                logging.error(f"Failed to insert {domain_name} into scraper table: {e}")
                failed_domains.append({
                    "domain": domain_name,
                    "url": url,
                    "reason": f"Database insert error: {str(e)}"
                })
        else:
            logging.error(f"Failed to generate summary for {domain_name}")
            failed_domains.append({
                "domain": domain_name,
                "url": url,
                "reason": "Summary generation failed"
            })
        
        print("-" * 80)
        
        # Small delay between domains
        if idx < len(domains_to_process):
            time.sleep(15)
    
    # Summary
    print("\n" + "=" * 80)
    print("SCRAPING SESSION COMPLETE")
    print("=" * 80)
    print(f"Total domains processed: {len(domains_to_process)}")
    print(f"├─ From static list: {len(STATIC_WEBSITES)}")
    print(f"└─ From Supabase: {len(domains_to_process) - len(STATIC_WEBSITES)}")
    print(f"\nResults:")
    print(f"✓ Successful: {success_count}")
    print(f"✗ Failed: {len(failed_domains)}")
    print(f"Success rate: {success_count/len(domains_to_process)*100:.1f}%")
    
    # Output failed domains
    if failed_domains:
        print("\n" + "=" * 80)
        print("FAILED DOMAINS")
        print("=" * 80)
        for failure in failed_domains:
            print(f"\nDomain: {failure['domain']}")
            print(f"URL: {failure['url']}")
            print(f"Reason: {failure['reason']}")
        print("=" * 80)
    
    print()


if __name__ == "__main__":
    main()