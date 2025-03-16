import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [inputCode, setInputCode] = useState('');
  const [outputCode, setOutputCode] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [success, setSuccess] = useState(false);
  const [aiProvider, setAiProvider] = useState('claude');
  const [apiKey, setApiKey] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(false);

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
    
    if (uploadedFile) {
      // Check file size (limit to 1MB)
      if (uploadedFile.size > 1024 * 1024) {
        setError('File size exceeds 1MB limit. Please upload a smaller file.');
        return;
      }
      
      // Check file type (optional)
      const validFileTypes = ['text/plain', 'text/javascript', 'text/x-python', 'application/x-javascript', 'application/json'];
      if (!validFileTypes.includes(uploadedFile.type) && uploadedFile.type !== '') {
        console.warn('File type may not be supported:', uploadedFile.type);
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          setInputCode(e.target.result);
          setError(null);
        } catch (err) {
          setError('Failed to read file. Please try again.');
          console.error('File reading error:', err);
        }
      };
      
      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
      };
      
      reader.readAsText(uploadedFile);
    }
  };

  const validateInput = () => {
    if (!inputCode || inputCode.trim() === '') {
      setError('Please enter or upload code to convert');
      return false;
    }
    
    if (inputCode.length > 50000) {
      setError('Code exceeds maximum length (50,000 characters). Please reduce the size.');
      return false;
    }
    
    return true;
  };

  const handleConvert = async () => {
    // Reset states
    setSuccess(false);
    setError(null);
    
    // Validate input
    if (!validateInput()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Set timeout for the request (30 seconds)
      const response = await axios.post('http://localhost:5000/convert', {
        code: inputCode,
        source_language: sourceLanguage === 'auto' ? null : sourceLanguage,
        language: targetLanguage,
        ai_provider: aiProvider,
        api_key: apiKey || null
      }, {
        timeout: 30000 // 30 seconds timeout
      });
      
      if (response.data && response.data.converted_code) {
        setOutputCode(response.data.converted_code);
        setSuccess(true);
      } else {
        setError('Conversion failed. The server returned an invalid response.');
      }
    } catch (err) {
      console.error('Error during conversion:', err);
      
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The server took too long to respond.');
      } else if (err.response) {
        // The server responded with a status code outside the 2xx range
        if (err.response.status === 429) {
          setError('Too many requests. Please try again later.');
        } else if (err.response.data && err.response.data.error) {
          setError(`Server error: ${err.response.data.error}`);
        } else {
          setError(`Server error (${err.response.status}). Please try again.`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response from server. Please check your connection and try again.');
      } else {
        // Something else caused the error
        setError('Conversion failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setInputCode('');
    setOutputCode('');
    setError(null);
    setSuccess(false);
    setFile(null);
    // Reset file input
    const fileInput = document.getElementById('fileUpload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const downloadCode = () => {
    if (!outputCode) return;
    
    // Create file extension based on target language
    const fileExtensions = {
      'javascript': 'js',
      'python': 'py',
      'java': 'java',
      'csharp': 'cs',
      'cpp': 'cpp',
      'go': 'go',
      'ruby': 'rb',
      'php': 'php',
      'cobol': 'cbl',
      'typescript': 'ts',
      'swift': 'swift',
      'kotlin': 'kt',
      'rust': 'rs',
      'scala': 'scala',
      'perl': 'pl',
      'r': 'r',
      'bash': 'sh',
      'sql': 'sql',
      'psql': 'sql'
    };
    
    const extension = fileExtensions[targetLanguage] || 'txt';
    const fileName = `converted_code.${extension}`;
    
    // Create a blob with the code
    const blob = new Blob([outputCode], { type: 'text/plain' });
    
    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // Append the link to the body
    document.body.appendChild(link);
    
    // Trigger the download
    link.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  // List of input languages
  const inputLanguages = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'cpp', label: 'C++' },
    { value: 'go', label: 'Go' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'php', label: 'PHP' },
    { value: 'sql', label: 'SQL' },
    { value: 'psql', label: 'PostgreSQL' }
  ];

  // List of target languages
  const targetLanguages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'cpp', label: 'C++' },
    { value: 'go', label: 'Go' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'php', label: 'PHP' },
    { value: 'cobol', label: 'COBOL' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'rust', label: 'Rust' },
    { value: 'scala', label: 'Scala' },
    { value: 'perl', label: 'Perl' },
    { value: 'r', label: 'R' },
    { value: 'bash', label: 'Bash/Shell' },
    { value: 'sql', label: 'SQL' },
    { value: 'psql', label: 'PostgreSQL' }
  ];

  // List of AI providers
  const aiProviders = [
    { value: 'claude', label: 'Claude AI' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'azure', label: 'Azure AI Studio' },
    { value: 'google', label: 'Google AI' }
  ];

  // Never store API keys in localStorage or client-side code
  // Instead, use a secure method
  const handleApiKeySubmit = (key) => {
    // Don't store the key directly in state or localStorage
    // Either use a session-only cookie with HTTPOnly flag
    // or just keep it in memory (state) for the current session
    setApiKey(key);
  };

  return (
    <div className="container mt-5">
      <h1 className="mb-4">Code Converter</h1>
      <p className="lead mb-4">
        Upload code in one programming language and convert it to another using AI.
      </p>
      
      <div className="row">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Input Code</h5>
              <button 
                className="btn btn-sm btn-outline-secondary" 
                onClick={clearAll}
                disabled={loading}
              >
                Clear All
              </button>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="sourceLanguageSelect" className="form-label">Source Language</label>
                <select 
                  className="form-select" 
                  id="sourceLanguageSelect"
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  disabled={loading}
                >
                  {inputLanguages.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="fileUpload" className="form-label">Upload Code File</label>
                <input 
                  type="file" 
                  className="form-control" 
                  id="fileUpload" 
                  onChange={handleFileUpload}
                  disabled={loading}
                />
                <small className="text-muted">Maximum file size: 1MB</small>
              </div>
              <div className="mb-3">
                <label htmlFor="inputCodeArea" className="form-label">Or Paste Code Here</label>
                <textarea 
                  className="form-control" 
                  id="inputCodeArea" 
                  rows="10"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    if (error && e.target.value) {
                      setError(null);
                    }
                  }}
                  disabled={loading}
                  placeholder="Enter your code here..."
                ></textarea>
                <small className="text-muted">Maximum length: 50,000 characters</small>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Output Code</h5>
              {outputCode && (
                <button 
                  className="btn btn-sm btn-outline-primary" 
                  onClick={downloadCode}
                  disabled={!outputCode}
                >
                  <i className="bi bi-download me-1"></i> Download
                </button>
              )}
            </div>
            <div className="card-body">
              {loading && (
                <div className="text-center mb-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Converting your code... This may take a few seconds.</p>
                </div>
              )}
              <textarea 
                className="form-control" 
                rows="10" 
                value={outputCode}
                readOnly
                placeholder="Converted code will appear here..."
              ></textarea>
              {success && (
                <div className="alert alert-success mt-3" role="alert">
                  Code successfully converted! You can download the converted code using the button above.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Conversion Options</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="targetLanguageSelect" className="form-label">Target Language</label>
                <select 
                  className="form-select" 
                  id="targetLanguageSelect"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  disabled={loading}
                >
                  {targetLanguages.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label htmlFor="aiProviderSelect" className="form-label mb-0">AI Provider</label>
                  <button 
                    className="btn btn-sm btn-link p-0" 
                    onClick={() => setShowApiConfig(!showApiConfig)}
                  >
                    {showApiConfig ? 'Hide API Config' : 'Show API Config'}
                  </button>
                </div>
                <select 
                  className="form-select" 
                  id="aiProviderSelect"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  disabled={loading}
                >
                  {aiProviders.map(provider => (
                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                  ))}
                </select>
              </div>
              
              {showApiConfig && (
                <div className="mb-3">
                  <label htmlFor="apiKeyInput" className="form-label">API Key (Optional)</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    id="apiKeyInput" 
                    value={apiKey}
                    onChange={(e) => handleApiKeySubmit(e.target.value)}
                    placeholder="Enter your API key here"
                    disabled={loading}
                  />
                  <small className="text-muted">
                    If not provided, the system will use the default API key.
                  </small>
                </div>
              )}
              
              <button 
                className="btn btn-primary w-100" 
                onClick={handleConvert}
                disabled={!inputCode || loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Converting...
                  </>
                ) : (
                  'Convert Code'
                )}
              </button>
              
              {error && (
                <div className="alert alert-danger mt-3" role="alert">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;