import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQS } from '../../utils/data';

const FaqItem = ({ faq, isOpen, onClick }) => {
   return  <div className="">
        <button onClick = {onClick} className="w-full flex justify-between items-center py-4 px-6 bg-gray-100 rounded-lg focus:outline-none">
            <span className="text-left font-medium text-gray-900">{faq.question}</span>
            <ChevronDown className={`h-5 w-5 text-gray-500 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
            <div className="px-6 pt-3 pb-4 text-gray-600 leading-relaxed border-t border-gray">
                {faq.answer}
            </div>
        )}
    
    </div>
};

const Faq = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const handleClick = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };
    return <section id="faq" className="py-20 lg:py-28 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Find answers to common questions about our AI-Powered Invoice Generator.
                    </p>
                </div>
                <div className="space-y-4">
                    {FAQS.map((faq, index) => (
                        <FaqItem
                            key={index}
                            faq={faq}
                            isOpen={openIndex === index}
                            onClick={() => handleClick(index)}
                        />
                    ))}
                </div>
            </div>  
        </section>    
};

export default Faq;