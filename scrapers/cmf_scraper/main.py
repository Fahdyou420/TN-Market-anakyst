import requests
from bs4 import BeautifulSoup
import logging

logging.basicConfig(filename='../../logs/scraping.log', level=logging.INFO)

def scrape_cmf():
    url = "http://www.cmf.tn/publications/communiques-du-cmf"
    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        # Scraping logic here...
        logging.info("CMF Scrape Success")
    except Exception as e:
        logging.error(f"CMF Scrape Fail: {e}")

if __name__ == "__main__":
    scrape_cmf()
