import React, { useState } from "react";
import { MessageSquare, Mail, Phone, Book, HelpCircle, Send } from "lucide-react";

const Support = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log("Support request:", formData);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Support Center</h1>
        <p className="text-gray-600 dark:text-white">Get help and support for your invoicing needs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Contact Cards */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-sky-700" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
          <p className="text-gray-600 text-sm mb-4">
            Send us an email and we'll respond within 24 hours
          </p>
          <a
            href="mailto:support@invoicy.com"
            className="text-sky-700 hover:text-sky-600 font-medium text-sm"
          >
            support@invoicy.com
          </a>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
            <Phone className="w-6 h-6 text-emerald-700" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp</h3>
          <p className="text-gray-600 text-sm mb-4">
            Chat with us instantly on WhatsApp
          </p>
          <a
            href="https://wa.me/1234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 hover:text-green-600 font-medium text-sm"
          >
            Open WhatsApp
          </a>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
            <Book className="w-6 h-6 text-violet-700" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
          <p className="text-gray-600 text-sm mb-4">
            Browse our comprehensive guides and tutorials
          </p>
          <button className="text-violet-700 hover:text-violet-600 font-medium text-sm">
            View Docs
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <HelpCircle className="w-6 h-6 text-indigo-700" />
            <h2 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-medium text-gray-900 mb-2">How do I create an invoice?</h3>
              <p className="text-sm text-gray-600">
                Navigate to the "Create Invoice" section from the sidebar and fill in the required
                details. You can also use AI to generate invoices automatically.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-medium text-gray-900 mb-2">How do I track payment status?</h3>
              <p className="text-sm text-gray-600">
                Go to the "Invoices" page to see all your invoices and their payment status. You can
                filter by paid, pending, or overdue.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-medium text-gray-900 mb-2">Can I customize invoice templates?</h3>
              <p className="text-sm text-gray-600">
                Yes! You can customize your invoice templates in the Settings section under Company
                Settings.
              </p>
            </div>

            <div className="pb-4">
              <h3 className="font-medium text-gray-900 mb-2">How does AI invoice generation work?</h3>
              <p className="text-sm text-gray-600">
                Simply paste any text, email, or receipt, and our AI will extract the relevant
                information to create a professional invoice automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Send us a message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What's this about?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="4"
                placeholder="Describe your issue or question"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Send className="w-5 h-5" />
              <span>Send Message</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Support;
