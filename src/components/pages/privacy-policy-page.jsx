import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Privacy Policy
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              At Chromie, we respect your privacy and the intellectual property you create using our platform.
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">
                Your Code is Protected
              </h2>
              <p className="text-blue-800">
                <strong>We will never sell, share, or misuse the code you create using Chromie.</strong> 
                Your creations remain your intellectual property, and we are committed to protecting your privacy.
              </p>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              What We Collect
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-600">
              <li>Account information (email, name) for authentication</li>
              <li>Usage data to improve our service</li>
              <li>Payment information (processed securely by our payment providers)</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              What We Don't Do
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-600">
              <li>We do not sell your personal information</li>
              <li>We do not access, read, or analyze your code content</li>
              <li>We do not share your code with third parties</li>
              <li>We do not use your code for training AI models</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Data Security
            </h2>
            <p className="text-gray-600 mb-6">
              We implement industry-standard security measures to protect your data and ensure your privacy is maintained at all times.
            </p>
            
            <div className="bg-green-50 border-l-4 border-green-400 p-6">
              <p className="text-green-800 font-medium">
                Your trust is important to us. We're committed to transparency and protecting your privacy while you build amazing Chrome extensions with Chromie.
              </p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
