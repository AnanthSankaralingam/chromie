#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import logging
import os
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from urllib.parse import urlparse # Added for filename generation

from bs4 import BeautifulSoup, Tag
from playwright.sync_api import sync_playwright, Error as PlaywrightError
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ---------------------------
# Data Structures
# ---------------------------

@dataclass
class ElementInfo:
    """A dataclass to hold detailed information about a found page element."""
    tag: str
    id: str | None
    classes: list[str] = field(default_factory=list)
    role: str | None = None
    selector: str = ""

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
# Helper Functions
# ---------------------------

def css_escape(s: str) -> str:
    """Escapes characters in a string for use in a CSS selector."""
    return re.sub(r"([^\w-])", r"\\\1", s)

def _nth_of_type_index(el: Tag) -> int:
    """Calculates the nth-of-type index for a given BeautifulSoup element."""
    if not el or not isinstance(el, Tag) or not el.parent:
        return 1
    same_tag_siblings = [c for c in el.parent.children if isinstance(c, Tag) and c.name == el.name]
    try:
        return same_tag_siblings.index(el) + 1
    except ValueError:
        return 1

def build_css_selector(el: Tag) -> str:
    """Generates a reasonably stable CSS selector for a BeautifulSoup element."""
    if not isinstance(el, Tag):
        return ""
    
    if _id := el.get("id"):
        return f"#{css_escape(_id)}"

    parts = []
    cur = el
    while isinstance(cur, Tag) and cur.name not in (None, "[document]"):
        idx = _nth_of_type_index(cur)
        parts.append(f"{cur.name}:nth-of-type({idx})")
        cur = cur.parent
        if cur is None or cur.name == "html":
            break
    parts.append("html")
    parts.reverse()
    return " > ".join(parts)

def url_to_filename(url: str) -> str:
    """Converts a URL into a safe, descriptive filename."""
    parsed_url = urlparse(url)
    # Replace dots with underscores and remove www.
    domain = parsed_url.netloc.replace("www.", "").replace(".", "_")
    return f"{domain}_summary.json"

def domain_to_url(domain_name: str) -> str:
    """Converts a domain name to a full URL with https:// if not present."""
    domain_name = domain_name.strip()
    if not domain_name.startswith(('http://', 'https://')):
        return f"https://{domain_name}"
    return domain_name


# ---------------------------
# Core Logic
# ---------------------------

def find_balanced_elements(html_content: str) -> list[ElementInfo]:
    """Parses HTML and finds a balanced set of important elements."""
    doc = BeautifulSoup(html_content, "html.parser")
    elements_found = []
    seen_selectors = set()
    
    selectors_to_find = [
        # Tier 1: Core Semantic Landmarks
        'header', 'nav', 'main', 'aside', 'footer',
        '[role="banner"]', '[role="navigation"]', '[role="main"]',
        '[role="complementary"]', '[role="contentinfo"]',
        # Tier 2: High-Confidence IDs for main containers
        '[id="main"]', '[id="content"]', '[id="app"]', '[id="root"]', '[id="page"]',
        '[id*="main-container"]', '[id*="content-wrapper"]',
        # Tier 3: Key Functional Components
        '[role="search"]', 'form:not([role="search"])', '[role="dialog"]', '[role="feed"]'
    ]

    for sel in selectors_to_find:
        for element in doc.select(sel, limit=5):
            selector = build_css_selector(element)
            if selector and selector not in seen_selectors:
                elements_found.append(ElementInfo(
                    tag=element.name,
                    id=element.get("id"),
                    classes=element.get("class", []),
                    role=element.get("role"),
                    selector=selector
                ))
                seen_selectors.add(selector)

    elements_found.sort(key=lambda x: len(x.selector))
    return elements_found

def generate_description_with_llm(element: ElementInfo, page_title: str) -> str:
    """Generates a description for a UI element using the Google Gemini API."""
    api_key = os.getenv("GOOGLE_AI_API_KEY")
    fallback_desc = f"A page element represented by a <{element.tag}> tag with ID '{element.id or 'none'}'."

    if not api_key:
        logging.warning("GOOGLE_AI_API_KEY not set. Using fallback description.")
        return fallback_desc

    try:scripts/simple_scraper.py
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        class_str = ' '.join(element.classes)
        
        # Simplified and more direct prompt
        prompt = (
            f"As a web developer, describe the purpose of an HTML element on a page titled '{page_title}'. "
            f"The element details are: Tag: <{element.tag}>, ID: '{element.id or 'N/A'}', "
            f"Classes: '{class_str or 'N/A'}', ARIA Role: '{element.role or 'N/A'}'. "
            "Provide a concise, one-sentence summary of its function."
        )

        generation_config = genai.types.GenerationConfig(
            temperature=0.1,
            max_output_tokens=1500 # Keeping this at a safe high value
        )
        safety_settings = {
            'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
            'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
            'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
            'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
        }

        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )

        # More robust check for valid content in the response
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            return response.text.strip()
        else:
            # Log the finish reason if no content is found
            finish_reason = "N/A"
            if response.candidates and response.candidates[0].finish_reason:
                finish_reason = response.candidates[0].finish_reason.name
            logging.warning(f"API returned no text content. Finish reason: {finish_reason}. Full response: {response}")
            return fallback_desc

    except Exception as e:
        logging.error(f"Google Gemini API call failed: {e}")
        return fallback_desc

def generate_page_summary(url: str) -> dict:
    """Fetches a URL with Playwright and generates a summary of its important elements."""
    logging.info(f"Starting balanced analysis for URL: {url}")
    summary = {"major_elements": {}}
    key_counts = defaultdict(int)

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            logging.info("Navigating to page...")
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            page_title = page.title()
            html_content = page.content()
            logging.info(f"Page '{page_title}' loaded successfully.")
            
            browser.close()
        except PlaywrightError as e:
            logging.error(f"Playwright failed to load the page: {e}")
            return {"error": "Failed to load the page with Playwright."}

    elements = find_balanced_elements(html_content)
    logging.info(f"Found {len(elements)} relevant elements to analyze.")
    
    summary["major_elements"]["entire_page_body"] = {
        "description": "The main wrapper for the entire application, good for global styles.",
        "selector": "body"
    }

    for element in elements[:10]:
        base_key = element.id or element.role or (element.classes[0] if element.classes else element.tag)
        sanitized_key = re.sub(r'[^a-zA-Z0-9_-]', '_', base_key)
        
        key_counts[sanitized_key] += 1
        final_key = f"{sanitized_key}_{key_counts[sanitized_key]}" if key_counts[sanitized_key] > 1 else sanitized_key

        logging.info(f"Generating description for element: {final_key} ({element.selector})...")
        description = generate_description_with_llm(element, page_title)
        
        summary["major_elements"][final_key] = {
            "description": description,
            "selector": element.selector
        }
        time.sleep(1) 

    logging.info(f"Analysis complete for {url}")
    return summary

# ---------------------------
# Main Execution Block
# ---------------------------

def main():
    """Main function to scrape domains from scraper_misses and save to scraper table."""
    
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    
    # Initialize Supabase client
    try:
        supabase = init_supabase()
        logging.info("✓ Connected to Supabase")
    except ValueError as e:
        logging.error(f"Failed to initialize Supabase: {e}")
        return
    
    # Fetch domains from scraper_misses table
    try:
        response = supabase.table("scraper_misses").select("domain_name, count").execute()
        scraper_misses = response.data
        logging.info(f"✓ Found {len(scraper_misses)} domains in scraper_misses table")
    except Exception as e:
        logging.error(f"Failed to fetch from scraper_misses: {e}")
        return
    
    if not scraper_misses:
        logging.info("No domains to scrape. Exiting.")
        return
    
    # Process each domain
    success_count = 0
    error_count = 0
    
    for row in scraper_misses:
        domain_name = row.get("domain_name")
        count = row.get("count", 0)
        
        if not domain_name:
            logging.warning("Skipping row with no domain_name")
            continue
        
        print("=" * 60)
        logging.info(f"Processing: {domain_name} (count: {count})")
        print("=" * 60)
        
        # Convert domain to URL
        url = domain_to_url(domain_name)
        logging.info(f"Scraping URL: {url}")
        
        # Scrape the page
        page_summary = generate_page_summary(url)
        
        if "error" not in page_summary:
            # Insert into scraper table
            try:
                insert_data = {
                    "domain_name": domain_name,
                    "scraper_output": page_summary,
                    "source": "scraped"
                }
                
                supabase.table("scraper").insert(insert_data).execute()
                logging.info(f"✓ Successfully saved {domain_name} to scraper table")
                
                # Delete the row from scraper_misses after successful processing
                try:
                    supabase.table("scraper_misses").delete().eq("domain_name", domain_name).execute()
                    logging.info(f"✓ Removed {domain_name} from scraper_misses table")
                except Exception as delete_error:
                    logging.warning(f"Failed to delete {domain_name} from scraper_misses: {delete_error}")
                
                success_count += 1
                
            except Exception as e:
                logging.error(f"Failed to insert {domain_name} into scraper table: {e}")
                error_count += 1
        else:
            logging.error(f"Error processing {domain_name}: {page_summary['error']}")
            error_count += 1
        
        print("-" * 60)
    
    # Summary
    print("\n" + "=" * 60)
    print("SCRAPING SUMMARY")
    print("=" * 60)
    print(f"Total domains processed: {len(scraper_misses)}")
    print(f"Successful: {success_count}")
    print(f"Errors: {error_count}")
    print("=" * 60)


if __name__ == "__main__":
    main()