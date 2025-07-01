// components/ModelSelector.jsx
import React from 'react';
import { LLM_MODELS } from '../constants/llmModels';

const ModelSelector = ({ selectedModel, onChange }) => {
  return (
    <div className="mb-4">
      <label htmlFor="model" className="block mb-1 font-medium">Chọn mô hình AI:</label>
      <select
        id="model"
        className="border px-3 py-2 rounded w-full"
        value={selectedModel}
        onChange={(e) => onChange(e.target.value)}
      >
        {LLM_MODELS.map((model) => (
          <option key={model.value} value={model.value}>
            {model.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModelSelector;