
import React, { useState } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

const KnowledgeSearch = ({ darkMode }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            // Adjust endpoint as needed, assuming GET /knowledge/search?q=...
            // If such endpoint doesn't exist, we might need to use the chat endpoint or a specific search endpoint.
            // For now, let's assume a dedicated search endpoint or use the existing list endpoint with filter if supported.
            // Based on previous context, user wants "Knowledge Search", likely RAG search debug or similar.
            // Using generic search endpoint for now.
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
            const res = await axios.get(`${API_URL}/knowledge/search?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResults(res.data.results || []);
        } catch (err) {
            console.error("Search error", err);
            setError("Failed to search knowledge base.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`p-4 rounded-lg w-full max-w-4xl mx-auto ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} shadow-md my-4`}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Search size={24} /> Knowledge Search
            </h3>

            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter keywords to search..."
                    className={`flex-1 p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            <div className="space-y-4">
                {results.length > 0 ? (
                    results.map((item, index) => (
                        <div key={index} className={`p-3 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <h4 className="font-bold text-lg text-purple-500">{item.title}</h4>
                            <p className="text-sm mt-1 opacity-90">{item.content?.substring(0, 200)}...</p>
                            <div className="mt-2 text-xs text-gray-500">
                                Score: {item.score?.toFixed(4)}
                            </div>
                        </div>
                    ))
                ) : (
                    !loading && query && <div className="text-center text-gray-500">No results found.</div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeSearch;
