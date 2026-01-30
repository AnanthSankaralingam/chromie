import React from 'react';
import AppBar from '@/components/ui/app-bars/app-bar';

// this is chromie's privacy policy page, not our user's
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white">
      <AppBar />
      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <div className="backdrop-blur-xl bg-slate-800/30 rounded-2xl border border-slate-700/40 p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-2 text-center">
            Legal
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50 mb-6 text-center">
            Privacy Policy
          </h1>
          <p className="text-slate-400 mb-8 text-center max-w-xl mx-auto">
            We respect your privacy and the intellectual property you create using our platform.
          </p>

          <div className="border-l-2 border-slate-600/60 bg-slate-800/40 rounded-r-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-50 mb-3">
              Your Code is Protected
            </h2>
            <p className="text-slate-300">
              <strong className="text-slate-50">We will never sell, share, or misuse the code you create using Chromie.</strong>{' '}
              Your creations remain your intellectual property, and we are committed to protecting your privacy.
            </p>
          </div>

          <h2 className="text-xl font-semibold text-slate-50 mb-3">
            What We Collect
          </h2>
          <ul className="list-disc pl-6 mb-8 text-slate-400 space-y-1">
            <li>Account information (email, name) for authentication</li>
            <li>Usage data to improve our service</li>
            <li>Payment information (processed securely by our payment providers)</li>
          </ul>

          <h2 className="text-xl font-semibold text-slate-50 mb-3">
            What We Don&apos;t Do
          </h2>
          <ul className="list-disc pl-6 mb-8 text-slate-400 space-y-1">
            <li>We do not sell your personal information</li>
            <li>We do not access, read, or analyze your code content</li>
            <li>We do not share your code with third parties</li>
            <li>We do not use your code for training AI models</li>
          </ul>

          <h2 className="text-xl font-semibold text-slate-50 mb-3">
            Data Security
          </h2>
          <p className="text-slate-400 mb-8">
            We implement industry-standard security measures to protect your data and ensure your privacy is maintained at all times.
          </p>

          <div className="border-l-2 border-slate-600/60 bg-slate-800/40 rounded-r-xl p-6">
            <p className="text-slate-300">
              Your trust is important to us. We&apos;re committed to transparency and protecting your privacy while you build amazing Chrome extensions with Chromie.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <p className="text-sm text-slate-500 text-center">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
