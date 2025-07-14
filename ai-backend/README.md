# Hunter College AI Advisor

An AI-powered chatbot system that provides academic advising for Hunter College students using web scraping, vector search, and OpenAI's GPT model.

## What it does

Scrapes Hunter College's website for current academic info
Creates a searchable database using vector embeddings
Answers student questions using GPT-4o-mini with relevant context
Provides source citations with responses

## Features

- **Web Scraping**: Automatically crawls Hunter College website to gather current academic information
- **Vector Database**: Creates searchable embeddings of content using sentence transformers
- **Intelligent Responses**: Uses OpenAI GPT-4o-mini to provide contextual academic advice
- **Academic Focus**: Specifically designed for Hunter College programs and pathways

## Files

- **hunter_main.py** - Web scraper
- **hunter_ai.py** - Main chatbot
- **hunter_content.txt** - Scraped content
- **unycompass_vectors.pkl** - Vector database

## Setup

**1. Install Python dependencies:**

```bash
pip install sentence-transformers
pip install scikit-learn
pip install langchain-openai
pip install python-dotenv
pip install requests
pip install beautifulsoup4
pip install numpy
```

OR 

```bash
pip install -r requirements.txt
```

**2. Add your OpenAI API key to ai-backend/api/hunter_api-key.env:**

```bash
OPENAI_API_KEY=your_key_here
```

**3.  Run the chatbot:**

```bash
python hunter_ai.py
```

## How it works
The scraper crawls up to 40 pages from hunter.cuny.edu and saves the content. The chatbot then:

1. Builds vector embeddings from the scraped text
2. Takes user questions and finds relevant content using similarity search
3. Sends the context to GPT-4o-mini to generate helpful responses

The system automatically handles the vector database creation on first run and includes rate limiting to be respectful to Hunter's servers.

## Configuration
You can adjust crawling limits, similarity thresholds, and GPT temperature in the code. The current setup uses a 2-second delay between requests and processes text in 500-word chunks.

## Ethics