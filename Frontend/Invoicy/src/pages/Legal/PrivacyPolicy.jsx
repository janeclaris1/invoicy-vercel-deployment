import React from "react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      <div className="prose prose-sm max-w-none space-y-4">
        <p>
          QickBill respects your privacy. This Privacy Policy describes how we collect, use, and
          protect your personal information when you use our service.
        </p>
        <p>
          This is a placeholder. Replace this page with your full Privacy Policy, including
          information we collect, how we use it, data retention, security, your rights (e.g. access,
          deletion), cookies, and contact details for privacy inquiries.
        </p>
        <p>
          Ensure your legal counsel reviews and approves the final text for compliance with
          applicable laws (e.g. GDPR, CCPA).
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

export default PrivacyPolicy;
