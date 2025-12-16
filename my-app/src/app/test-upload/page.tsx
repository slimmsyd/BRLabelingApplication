'use client';

import React, { useState, useRef } from 'react';
import { testSimpleUpload, SimpleUploadResult } from '@/lib/storage/test-upload';

/**
 * Minimal test page to debug upload issues
 * Visit: http://localhost:3000/test-upload
 */
export default function TestUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<SimpleUploadResult | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setResult(null);

        try {
            const uploadResult = await testSimpleUpload(file);
            setResult(uploadResult);
        } catch (error) {
            setResult({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
            <h1>🧪 Upload Debug Test</h1>
            <p>Minimal upload test to debug the 413 error</p>

            <hr style={{ margin: '20px 0' }} />

            <div style={{ marginBottom: '20px' }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="video/*"
                />
            </div>

            {file && (
                <div style={{
                    background: '#f0f0f0',
                    padding: '15px',
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}>
                    <strong>Selected File:</strong>
                    <pre style={{ margin: '10px 0' }}>
                        Name: {file.name}
                        Size: {(file.size / 1024 / 1024).toFixed(2)} MB ({file.size} bytes)
                        Type: {file.type}
                    </pre>

                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            backgroundColor: loading ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Uploading...' : 'Test Upload'}
                    </button>
                </div>
            )}

            {result && (
                <div style={{
                    background: result.success ? '#d4edda' : '#f8d7da',
                    padding: '20px',
                    borderRadius: '5px',
                    marginTop: '20px'
                }}>
                    <h3>{result.success ? '✅ SUCCESS' : '❌ FAILED'}</h3>

                    {result.error && (
                        <pre style={{
                            background: '#fff',
                            padding: '10px',
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                        }}>
                            {result.error}
                        </pre>
                    )}

                    {result.details && (
                        <div style={{ marginTop: '15px' }}>
                            <strong>Details:</strong>
                            <pre style={{ background: '#fff', padding: '10px' }}>
                                {JSON.stringify(result.details, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: '30px', color: '#666' }}>
                <strong>Instructions:</strong>
                <ol>
                    <li>Open browser console (F12 → Console)</li>
                    <li>Select a video file</li>
                    <li>Click "Test Upload"</li>
                    <li>Check console for detailed logs</li>
                </ol>
            </div>
        </div>
    );
}
