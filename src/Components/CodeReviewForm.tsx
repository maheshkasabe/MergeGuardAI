"use client";
import { useState } from 'react';
const CodeReviewForm = () => {
  const [userPrompt, setUserPrompt] = useState('');
  const [Res, setRes] = useState('');

  const handleClick = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/reviewcode', {
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
      console.log('API Response:', data);  // Log the entire response to inspect its structure
      setRes(data.res);
    } catch (error) {
      console.error('Error fetching response:', error);
      setRes('An error occurred. Please try again.');
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
      <p>{Res}</p>
    </div>
  );
};

export default CodeReviewForm;
