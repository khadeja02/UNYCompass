import requests
from bs4 import BeautifulSoup # for parsing HTML files
from urllib.parse import urljoin, urlparse
import time
from collections import deque # to store data types

class WebCrawler:
    def __init__(self, base_url, max_pages=50, delay=2):
        self.base_url = base_url
        self.max_pages = max_pages
        self.delay = delay
        self.visited_urls = set()
        self.to_visit = deque([base_url])
        self.all_text = ""
        self.page_count = 0
        self.base_domain = urlparse(base_url).netloc

    # checks if links can be crawled
    def is_valid_url(self, url):
        """Check if URL should be crawled"""
        parsed = urlparse(url)

        if parsed.netloc != self.base_domain:
            return False
        
        # Skip files we don't need
        skip_extensions = ['.pdf', '.jpg', '.png', '.gif', '.doc']
        if any(url.lower().endswith(ext) for ext in skip_extensions):
            return False
               
        # Skip non-content links
        skip_paths = ['#', 'mailto:', 'tel:', 'javascript:']
        if any(url.lower().startswith(path) for path in skip_paths):
            return False
        
        return True
    
    # finds clickable links from the web page
    def get_links(self, soup, current_url):
        """Extract links from page"""
        links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            full_url = urljoin(current_url, href)
            
            if self.is_valid_url(full_url) and full_url not in self.visited_urls:
                links.append(full_url)
        
        return links
    
    # Extracts clean text from HTML on webpage
    def extract_text(self, soup):
        """Get text content from page"""
        # Remove unwanted elements
        for element in soup(["script", "style", "nav", "footer", "header"]):
            element.decompose()
        
        # Get text from content elements
        text_elements = soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'div', 'article', 'section'])
        
        page_text = ""
        for element in text_elements:
            element_text = element.get_text(strip=True)
            if element_text and len(element_text) > 10:
                page_text += element_text + "\n"
        
        return page_text


    # Main web crawl function
    def crawl(self):
        """Main crawling function"""
        print(f"Starting crawl of {self.base_url}")
        print(f"Will crawl up to {self.max_pages} pages")
        
        while self.to_visit and self.page_count < self.max_pages:
            current_url = self.to_visit.popleft()
            
            if current_url in self.visited_urls:
                continue
                
            try:
                print(f"Crawling page {self.page_count + 1}: {current_url}")
                
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                
                response = requests.get(current_url, headers=headers, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Extract text
                page_text = self.extract_text(soup)
                if page_text.strip():
                    self.all_text += f"\n\n--- PAGE: {current_url} ---\n\n"
                    self.all_text += page_text
                
                # Find new links
                new_links = self.get_links(soup, current_url)
                for link in new_links[:10]:  # Limit links per page
                    if link not in self.visited_urls:
                        self.to_visit.append(link)
                
                self.visited_urls.add(current_url)
                self.page_count += 1
                
                # be polite to the server by waiting a few sections bewteen visits :)
                time.sleep(self.delay)
                
            except Exception as e:
                print(f"Error with {current_url}: {e}")
                continue
        
        print(f"Crawling done. Visited {self.page_count} pages.")
        return self.all_text
    
    # saves scraped content to file
    def save_content(self, filename="../docs/hunter_content.txt"):
        """Save crawled content to file"""        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(self.all_text)
            print(f"Content saved to {filename}")
            print(f"Total characters: {len(self.all_text)}")
        except Exception as e:
            print(f"Error saving file: {e}")

# creates web crawl specificially fo hunter website
def crawl_hunter_site():
    base_url = "https://hunter.cuny.edu"
    
    crawler = WebCrawler(
        base_url=base_url,
        max_pages=40,
        delay=2
    )
    
    content = crawler.crawl()
    crawler.save_content("../docs/hunter_content.txt")
    
    return content

if __name__ == "__main__":
        crawl_hunter_site()