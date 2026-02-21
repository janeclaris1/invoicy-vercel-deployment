import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import heroImg from "../../assets/HERO_IMG.png";

const Hero = () => {
    const { isAuthenticated } = useAuth();

    return (
        <section className="relative bg-[#fbfbfb] overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:68px_68px]"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-blue-950 leading-tight">
                        Invoicy - Accounting and Invoicing Software for Freelancers and Small Businesses
                    </h1>
                    <p className="text-base sm:text-xl text-gray-700 mb-8 leading-relaxed max-w-3xl mx-auto">
                        Simplify your invoicing and accounting with AI-powered Invoicy. Create professional invoices from simple text, generate payment reminders, track expenses, daily report on WhatsApp, provides smart insights and manage your finances all in one place.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        {isAuthenticated ? (
                            <Link to="/dashboard" className="bg-gradient-to-r from-blue-950 to-blue-900 text-white px-8 py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-blue-900 transition-all duration-200 hover:scale-105 hover:shadow-2xl transform">
                                Go to Dashboard
                            </Link>
                        ) : (
                            <Link to="/signup" className="bg-gradient-to-r from-blue-950 to-blue-900 text-white px-8 py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-gray-800 transition-all duration-200 hover:scale-105 hover:shadow-2xl transform">
                                Get Started for Free
                            </Link>
                        )}
                        <a href="#features" className="border-2 border-black text-black px-8 py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-slate-100 hover:text-black transition-all duration-200 hover:scale-105">
                            Learn More
                        </a>
                    </div>
                </div>
                <div className="mt-12 sm:mt-16 lg:mt-20 flex justify-center">
                    <div className="w-full max-w-4xl h-64 sm:h-80 bg-gradient-to-br from-blue-100 to-slate-100 rounded-lg shadow-2xl flex items-center justify-center border border-blue-200/50 overflow-hidden">
                        <img src={heroImg} alt="Invoicy banner" className="w-full h-full object-cover object-center" />
                    </div>
                </div>
            </div>
        </section>
    );

    
}

export default Hero;