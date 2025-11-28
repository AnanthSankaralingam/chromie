#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AWS Lambda function for web scraping with Hyperbrowser and Gemini AI.
"""
from hyperbrowser import Hyperbrowser
from hyperbrowser.models import StartScrapeJobParams, CreateSessionParams, ScrapeOptions
import json
import logging
import os
from urllib.parse import urlparse
from typing import Dict, Any

from bs4 import BeautifulSoup, Comment
from google import genai
from supabase import create_client, Client

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# LLM Prompt Template
PROMPT_TEMPLATE = """You are analyzing a webpage to identify key UI elements for Chrome extension development.

Page Title: {page_title}
URL: {url}
Page HTML: {html_content}

Task: Analyze the HTML and identify 8-12 important UI elements that Chrome extensions commonly interact with.

For each element, provide:
1. A semantic key name (e.g., search_form, login_button, main_navigation)
2. A one-sentence description of its purpose
3. A CSS selector to locate it

Prioritize:
- Interactive elements (buttons, forms, inputs)
- Navigation and menus
- Search functionality
- Main content areas
- Modals and dialogs
- Common UI patterns (dropdowns, tooltips, etc.)

Return ONLY a valid JSON object with this exact structure:

{{
  "major_elements": {{
    "semantic_key_1": {{
      "description": "One sentence describing what this element does",
      "selector": "css_selector_here"
    }},
    "semantic_key_2": {{
      "description": "One sentence describing what this element does",
      "selector": "css_selector_here"
    }}
  }}
}}

Rules:
- Use 8-12 elements
- Each key should be a semantic name (snake_case)
- Each description should be exactly one sentence
- Provide stable, reliable CSS selectors (prefer IDs and classes over complex paths)
- Output ONLY the JSON object, starting with {{ and ending with }}"""

# Tags to exclude during scraping (handled by Hyperbrowser)
EXCLUDE_TAGS = [
    "script", "style", "noscript", "svg", "img", 
    "video", "audio", "source", "track", "iframe", 
    "canvas", "meta", "link"
]

# ---------------------------
# Helper Functions
# ---------------------------

def init_supabase() -> Client:
    """Initialize and return Supabase client."""
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment")
    
    return create_client(supabase_url, supabase_key)

def sanitize_html(html_content: str) -> str:
    """
    Additional HTML sanitization to remove inline styles, JS handlers, and comments.
    Note: Hyperbrowser already excludes major tags via exclude_tags parameter.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    
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
    logger.info(f"HTML sanitized: {len(html_content):,} → {len(sanitized):,} characters "
                f"({(1 - len(sanitized)/len(html_content))*100:.1f}% reduction)")
    
    return sanitized

def extract_domain_from_url(url: str) -> str:
    """Extracts clean domain name from URL."""
    parsed = urlparse(url)
    return parsed.netloc.replace("www.", "")

def scrape_with_hyperbrowser(url: str) -> tuple[str, str]:
    """
    Scrapes a URL using Hyperbrowser.
    Returns (page_title, html_content).
    """
    api_key = os.getenv("HYPERBROWSER_API_KEY")
    
    if not api_key:
        raise ValueError("HYPERBROWSER_API_KEY must be set in environment")
    
    client = Hyperbrowser(api_key=api_key)
    
    logger.info(f"Starting Hyperbrowser scrape for: {url}")
    
    scrape_result = client.scrape.start_and_wait(
        StartScrapeJobParams(
            url=url,
            session_options=CreateSessionParams(
                use_stealth=True,
                accept_cookies=True
            ),
            scrape_options=ScrapeOptions(
                formats=["html"],
                only_main_content=True,
                exclude_tags=EXCLUDE_TAGS,
                wait_for=2000,  # Wait 2 seconds after page load
            ),
        )
    )
    
    # Extract HTML content from result
    html_content = scrape_result.data.get("html", "")
    
    # Extract page title from HTML
    soup = BeautifulSoup(html_content, "html.parser")
    page_title = soup.title.string if soup.title else extract_domain_from_url(url)
    
    logger.info(f"✓ Hyperbrowser scrape complete. Page: '{page_title}' ({len(html_content):,} characters)")
    
    return page_title, html_content

def generate_summary_with_llm(page_title: str, url: str, html_content: str) -> tuple[dict, dict]:
    """
    Generates a page summary using Gemini with JSON output.
    Returns (summary_dict, token_usage_dict).
    """
    api_key = os.getenv("GOOGLE_AI_API_KEY")
    
    if not api_key:
        logger.error("GOOGLE_AI_API_KEY not set.")
        return {
            "major_elements": {
                "error": {
                    "description": "API key not configured",
                    "selector": "body"
                }
            }
        }, {}

    try:
        client = genai.Client(api_key=api_key)
        sanitized_html = sanitize_html(html_content)
        
        prompt = PROMPT_TEMPLATE.format(
            page_title=page_title,
            url=url,
            html_content=sanitized_html[:100000]
        )
        
        logger.info("Sending analysis request to LLM...")
        
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.1,
                "max_output_tokens": 4096
            }
        )

        token_usage = {
            "prompt_tokens": response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0,
            "completion_tokens": response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0,
            "total_tokens": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0
        }
        
        logger.info(f"✓ Token usage - Prompt: {token_usage['prompt_tokens']:,}, "
                   f"Completion: {token_usage['completion_tokens']:,}, "
                   f"Total: {token_usage['total_tokens']:,}")

        try:
            summary = json.loads(response.text)
            
            if "major_elements" not in summary:
                logger.warning("Response missing 'major_elements', wrapping...")
                summary = {"major_elements": summary}
            
            logger.info(f"✓ Successfully generated summary with {len(summary['major_elements'])} elements")
            return summary, token_usage
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            return {
                "major_elements": {
                    "parse_error": {
                        "description": "Failed to parse LLM response",
                        "selector": "body"
                    }
                }
            }, token_usage

    except Exception as e:
        logger.error(f"Google Gemini API call failed: {e}")
        return {
            "major_elements": {
                "api_error": {
                    "description": f"LLM API call failed: {str(e)}",
                    "selector": "body"
                }
            }
        }, {}

def save_to_supabase(domain: str, scraper_output: dict) -> bool:
    """
    Saves scraper output to Supabase 'scraper' table.
    Returns True if successful, False otherwise.
    """
    try:
        supabase = init_supabase()
        
        insert_data = {
            "domain_name": domain,
            "scraper_output": scraper_output,
            "source": "hyperbrowser-lambda"
        }
        
        supabase.table("scraper").upsert(
            insert_data,
            on_conflict="domain_name"
        ).execute()
        
        logger.info(f"✓ Successfully saved {domain} to Supabase")
        return True
        
    except Exception as e:
        logger.error(f"Failed to save to Supabase: {e}")
        return False

def scrape_url(url: str) -> dict:
    """
    Main function to scrape a URL using Hyperbrowser and return an LLM-generated summary.
    """
    logger.info(f"Starting scrape for URL: {url}")
    
    domain = extract_domain_from_url(url)
    
    try:
        page_title, html_content = scrape_with_hyperbrowser(url)
        
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        return {
            "major_elements": {
                "error": {
                    "description": f"Configuration error: {str(e)}",
                    "selector": "body"
                }
            },
            "token_usage": {},
            "domain": domain
        }
    except Exception as e:
        logger.error(f"Hyperbrowser scraping failed: {e}")
        return {
            "major_elements": {
                "error": {
                    "description": f"Scraping error: {str(e)}",
                    "selector": "body"
                }
            },
            "token_usage": {},
            "domain": domain
        }
    
    logger.info("Generating page summary with LLM...")
    summary, token_usage = generate_summary_with_llm(page_title, url, html_content)
    
    result = {
        "major_elements": summary["major_elements"],
        "token_usage": token_usage,
        "domain": domain,
        "page_title": page_title
    }
    
    # Save to Supabase if successful
    if "error" not in summary.get("major_elements", {}):
        logger.info("Saving results to Supabase...")
        storage_data = {"major_elements": summary["major_elements"]}
        saved = save_to_supabase(domain, storage_data)
        result["saved_to_db"] = saved
    else:
        logger.warning("Skipping Supabase save due to error in results")
        result["saved_to_db"] = False
    
    logger.info(f"✓ Scrape complete for {domain}")
    return result

# ---------------------------
# Lambda Handler
# ---------------------------

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function.
    
    Expected input format:
    {
        "url": "https://example.com"
    }
    
    Or for API Gateway:
    {
        "body": "{\"url\": \"https://example.com\"}"
    }
    
    Returns:
    {
        "statusCode": 200,
        "body": {
            "major_elements": {...},
            "token_usage": {...},
            "domain": "example.com",
            "page_title": "Example Domain",
            "saved_to_db": true
        }
    }
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Handle both direct invocation and API Gateway
        if "body" in event:
            # API Gateway format
            body = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]
            url = body.get("url")
        else:
            # Direct invocation format
            url = event.get("url")
        
        # Validate URL
        if not url:
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "error": "Missing required parameter 'url'"
                })
            }
        
        # Validate URL format
        if not url.startswith(("http://", "https://")):
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "error": "URL must start with http:// or https://"
                })
            }
        
        # Scrape the URL
        result = scrape_url(url)
        
        # Check if there was an error
        if "error" in result.get("major_elements", {}):
            return {
                "statusCode": 500,
                "body": json.dumps({
                    "error": "Scraping failed",
                    "details": result
                })
            }
        
        # Success response
        return {
            "statusCode": 200,
            "body": json.dumps(result)
        }
        
    except Exception as e:
        logger.error(f"Lambda handler error: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": "Internal server error",
                "message": str(e)
            })
        }