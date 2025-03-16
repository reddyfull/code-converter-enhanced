from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import bleach

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Configure CORS to only allow requests from your frontend domain
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Use environment variables for sensitive information
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# API URLs
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
GOOGLE_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["100 per day", "20 per hour"]
)

@app.route('/')
def hello():
    return "Backend is running!"

@app.route('/upload', methods=['POST'])
def upload_code():
    """
    Endpoint to handle code uploads or text input.
    Expects JSON with 'code' field.
    """
    try:
        data = request.get_json()
        
        if not data or 'code' not in data:
            return jsonify({'error': 'No code provided'}), 400
            
        code = data.get('code')
        return jsonify({'received_code': code, 'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/convert', methods=['POST'])
@limiter.limit("10 per minute")
def convert_code():
    """
    Endpoint to process the conversion request using selected AI provider.
    Expects JSON with 'code', 'source_language', 'language', and 'ai_provider' fields.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        # Sanitize input to prevent injection attacks
        code = bleach.clean(data.get('code', ''))
        source_language = bleach.clean(data.get('source_language', ''))
        target_language = bleach.clean(data.get('language', ''))
        ai_provider = data.get('ai_provider', 'claude')
        api_key = data.get('api_key')
        
        if not code:
            return jsonify({'error': 'No code provided'}), 400
        if not target_language:
            return jsonify({'error': 'No target language specified'}), 400
        
        # Call appropriate AI API to convert the code
        if ai_provider == 'claude':
            converted_code = call_claude_api(code, target_language, source_language, api_key)
        elif ai_provider == 'openai':
            converted_code = call_openai_api(code, target_language, source_language, api_key)
        elif ai_provider == 'azure':
            converted_code = call_azure_openai_api(code, target_language, source_language, api_key)
        elif ai_provider == 'google':
            converted_code = call_google_api(code, target_language, source_language, api_key)
        else:
            return jsonify({'error': f'Unsupported AI provider: {ai_provider}'}), 400
        
        if not converted_code:
            return jsonify({'error': 'Code conversion failed'}), 500
            
        return jsonify({
            'status': 'success',
            'converted_code': converted_code,
            'source_language': source_language if source_language else 'auto-detected',
            'target_language': target_language,
            'ai_provider': ai_provider
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def call_claude_api(code, target_language, source_language=None, api_key=None):
    """
    Call Claude API to convert code from one language to another.
    
    Args:
        code (str): The source code to convert
        target_language (str): The target programming language
        source_language (str, optional): The source programming language (if known)
        api_key (str, optional): Custom API key to use
        
    Returns:
        str: The converted code or None if conversion failed
    """
    # Use provided API key or fall back to environment variable
    key_to_use = api_key if api_key else CLAUDE_API_KEY
    
    if not key_to_use:
        print("Error: Claude API key not found")
        return None
        
    headers = {
        "x-api-key": key_to_use,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    # Prepare the prompt for Claude
    source_lang_text = f"from {source_language}" if source_language else "from the original language"
    
    prompt = f"""Convert the following code {source_lang_text} to {target_language}. 
Return only the converted code without any explanations or markdown formatting.

Original code:
```
{code}
```

Converted {target_language} code:
"""
    
    # Prepare the request payload
    payload = {
        "model": "claude-3-sonnet-20240229",
        "max_tokens": 4000,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    
    try:
        print(f"Calling Claude API...")
        response = requests.post(CLAUDE_API_URL, headers=headers, json=payload)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        # Parse the response
        result = response.json()
        print(f"API Response received")
        
        if 'content' in result and len(result['content']) > 0:
            converted_code = result['content'][0]['text']
            return converted_code
        else:
            print("Error: Unexpected API response format")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error calling Claude API: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        return None

def call_openai_api(code, target_language, source_language=None, api_key=None):
    """
    Call OpenAI API to convert code from one language to another.
    
    Args:
        code (str): The source code to convert
        target_language (str): The target programming language
        source_language (str, optional): The source programming language (if known)
        api_key (str, optional): Custom API key to use
        
    Returns:
        str: The converted code or None if conversion failed
    """
    # Use provided API key or fall back to environment variable
    key_to_use = api_key if api_key else OPENAI_API_KEY
    
    if not key_to_use:
        print("Error: OpenAI API key not found")
        return None
        
    headers = {
        "Authorization": f"Bearer {key_to_use}",
        "Content-Type": "application/json"
    }
    
    # Prepare the prompt for OpenAI
    source_lang_text = f"from {source_language}" if source_language else "from the original language"
    
    prompt = f"""Convert the following code {source_lang_text} to {target_language}. 
Return only the converted code without any explanations or markdown formatting.

Original code:
```
{code}
```

Converted {target_language} code:
"""
    
    # Prepare the request payload
    payload = {
        "model": "gpt-4",
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 4000
    }
    
    try:
        print(f"Calling OpenAI API...")
        response = requests.post(OPENAI_API_URL, headers=headers, json=payload)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        # Parse the response
        result = response.json()
        print(f"API Response received")
        
        if 'choices' in result and len(result['choices']) > 0:
            converted_code = result['choices'][0]['message']['content']
            return converted_code
        else:
            print("Error: Unexpected API response format")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error calling OpenAI API: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        return None

def call_azure_openai_api(code, target_language, source_language=None, api_key=None):
    """
    Call Azure OpenAI API to convert code from one language to another.
    
    Args:
        code (str): The source code to convert
        target_language (str): The target programming language
        source_language (str, optional): The source programming language (if known)
        api_key (str, optional): Custom API key to use
        
    Returns:
        str: The converted code or None if conversion failed
    """
    # Use provided API key or fall back to environment variable
    key_to_use = api_key if api_key else AZURE_OPENAI_API_KEY
    endpoint = AZURE_OPENAI_ENDPOINT
    deployment = AZURE_OPENAI_DEPLOYMENT
    
    if not key_to_use:
        print("Error: Azure OpenAI API key not found")
        return None
    
    if not endpoint:
        print("Error: Azure OpenAI endpoint not found")
        return None
        
    if not deployment:
        print("Error: Azure OpenAI deployment name not found")
        return None
    
    # Construct the Azure OpenAI API URL
    api_version = "2024-02-01"
    azure_openai_url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
    
    headers = {
        "api-key": key_to_use,
        "Content-Type": "application/json"
    }
    
    # Prepare the prompt for Azure OpenAI
    source_lang_text = f"from {source_language}" if source_language else "from the original language"
    
    prompt = f"""Convert the following code {source_lang_text} to {target_language}. 
Return only the converted code without any explanations or markdown formatting.

Original code:
```
{code}
```

Converted {target_language} code:
"""
    
    # Prepare the request payload
    payload = {
        "messages": [
            {
                "role": "system",
                "content": "You are a code conversion assistant that translates code between programming languages."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 4000
    }
    
    try:
        print(f"Calling Azure OpenAI API...")
        response = requests.post(azure_openai_url, headers=headers, json=payload)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        # Parse the response
        result = response.json()
        print(f"API Response received")
        
        if 'choices' in result and len(result['choices']) > 0:
            converted_code = result['choices'][0]['message']['content']
            return converted_code
        else:
            print("Error: Unexpected API response format")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error calling Azure OpenAI API: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        return None

def call_google_api(code, target_language, source_language=None, api_key=None):
    """
    Call Google Gemini API to convert code from one language to another.
    
    Args:
        code (str): The source code to convert
        target_language (str): The target programming language
        source_language (str, optional): The source programming language (if known)
        api_key (str, optional): Custom API key to use
        
    Returns:
        str: The converted code or None if conversion failed
    """
    # Use provided API key or fall back to environment variable
    key_to_use = api_key if api_key else GOOGLE_API_KEY
    
    if not key_to_use:
        print("Error: Google API key not found")
        return None
    
    # Prepare the prompt for Google
    source_lang_text = f"from {source_language}" if source_language else "from the original language"
    
    prompt = f"""Convert the following code {source_lang_text} to {target_language}. 
Return only the converted code without any explanations or markdown formatting.

Original code:
```
{code}
```

Converted {target_language} code:
"""
    
    # Prepare the request payload
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": 4000
        }
    }
    
    url = f"{GOOGLE_API_URL}?key={key_to_use}"
    
    try:
        print(f"Calling Google API...")
        response = requests.post(url, json=payload)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        # Parse the response
        result = response.json()
        print(f"API Response received")
        
        if 'candidates' in result and len(result['candidates']) > 0:
            converted_code = result['candidates'][0]['content']['parts'][0]['text']
            return converted_code
        else:
            print("Error: Unexpected API response format")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error calling Google API: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        return None

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')