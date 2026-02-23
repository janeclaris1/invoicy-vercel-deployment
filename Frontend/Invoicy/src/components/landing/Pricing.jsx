import { useState } from "react";
import { Link } from "react-router-dom";
import PRICING_PLANS from "../../utils/data";
import { Check } from "lucide-react";

const Pricing = () => { 
    const [isAnnual, setIsAnnual] = useState(false);

    return (
        <section id="pricing" className="py-20 lg:py-28 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                        Pricing Plans
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                        Choose a plan that fits your needs and budget.
                    </p>
                    
                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <span className={`text-lg font-medium transition-colors ${!isAnnual ? 'text-blue-900' : 'text-gray-500'}`}>
                            Monthly
                        </span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${isAnnual ? 'bg-blue-900' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-9' : 'translate-x-1'}`} />
                        </button>
                        <span className={`text-lg font-medium transition-colors ${isAnnual ? 'text-blue-900' : 'text-gray-500'}`}>
                            Annual
                        </span>
                        {isAnnual && (
                            <span className="ml-2 inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                                Save 17%
                            </span>
                        )}
                    </div>
                </div>
                <div className="grid gap-8 lg:grid-cols-3">
                    {PRICING_PLANS.map((plan, index) => {
                        const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
                        const planId = plan.name.toLowerCase();
                        const interval = isAnnual ? 'annual' : 'monthly';
                        const isEnterprise = plan.name === "Enterprise";

                        return (
                            <div key={index} className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-blue-900">
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">{plan.name}</h3>         
                                <div className="mb-6">
                                    {price ? (
                                        <>
                                            <p className="text-4xl font-extrabold text-gray-900">
                                                {plan.currency} {price}
                                            </p>
                                            <p className="text-base font-medium text-gray-500">
                                                per {isAnnual ? 'year' : 'month'}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-3xl font-extrabold text-gray-900">Contact Us</p>
                                    )}
                                </div>
                                <ul className="mb-8 space-y-4">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start text-gray-600">
                                            <Check className="w-5 h-5 text-blue-900 mr-3 mt-0.5 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                {isEnterprise ? (
                                    <Link to="/support" className="block w-full bg-gradient-to-r from-blue-950 to-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition-all duration-200 hover:scale-105 hover:shadow-lg text-center">
                                        Contact Sales
                                    </Link>
                                ) : (
                                    <Link
                                        to={`/signup?plan=${planId}&interval=${interval}`}
                                        className="block w-full bg-gradient-to-r from-blue-950 to-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition-all duration-200 hover:scale-105 hover:shadow-lg text-center"
                                    >
                                        Choose {plan.name}
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default Pricing;