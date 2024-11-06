 ```jsx
import { useState } from 'react';

const CodeReviewForm = () => {
  const [userPrompt, setUserPrompt] = useState('');
  const [result, setResult] = useState('');

  const handleClick = async () => {
    try {
      const response = await fetch('/api/reviewcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userPrompt }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Error fetching response:', error);
      setResult('An error occurred. Please try again.');
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Enter your prompt here"
        value={userPrompt}
        onChange={(e) => setUserPrompt(e.target.value)}
      />
      <button onClick={handleClick}>Submit</button>
      <p>{result}</p>
    </div>
  );
};

export default CodeReviewForm;
```