import React from "react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      <div className="prose prose-sm max-w-none space-y-4">
        <p>
          By creating an account and using Invoicy, you agree to be bound by these Terms of Service.
          Please read them carefully before signing up.
        </p>
        <p>
          This is a placeholder. Replace this page with your full Terms of Service document,
          including acceptance of terms, permitted use, account responsibilities, payment terms,
          intellectual property, limitation of liability, and governing law.
        </p>
        <p>
          Ensure your legal counsel reviews and approves the final text for enforceability.
        </p>
      </div>
      <div className="mt-8 pt-6 border-t">
        <Link to="/signup" className="text-blue-900 font-medium hover:underline">
          ← Back to sign up
        </Link>
      </div>
    </div>
  );
};

export default TermsOfService;
