import {Link} from "react-router-dom";
import {Twitter, Github, Linkedin, FileText} from "lucide-react";

const FooterLink = ({href, to, children, className = ""}) => {
    const linkClassName = "block text-gray-400 hover:text-white transition-colors duration-200 " + className;
    if (to) {
        return <Link to={to} className={linkClassName}>{children}</Link>;
    }
    return <a href={href} className={linkClassName}>{children}</a>;
};

const SocialLink = ({href, children}) => (
    <a 
        href={href} 
        className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors duration-200"
        target="_blank" 
        rel="noopener noreferrer"
    >
        {children}
    </a>
);

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-4 md:col-span-2 lg:col-span-1">
                        <Link to="/" className="flex items-center space-x-2 mb-6">
                            <div className="w-8 h-8 bg-blue-950 rounded-md flex items-center justify-center">
                                <FileText className="w-4 h-4 text-white" />
                                <span className="text-xl font-bold">Invoicy</span>
                            </div>
                        </Link>
                        <p className="text-gray-400  leading-relaxed max-w-sm">
                            The simplest way to create and manage invoices for your business.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold mb-4">Product</h3>
                        <ul className="space-y-2">
                            <li>
                                <FooterLink to="/features" className="">Features</FooterLink>
                            </li>
                            <li>
                                <FooterLink to="/pricing" className="">Pricing</FooterLink>
                            </li>
                            <li>
                                <FooterLink to="/testimonials" className="">Testimonials</FooterLink>
                            </li>
                            <li>
                                <FooterLink to="/faq" className="">FAQ</FooterLink>
                            </li>
                        </ul>
                    </div>
                    <div >
                        <h3 className="text-base font-semibold mb-4">Company</h3>
                        <ul className="space-y-2">
                            <li>
                                <FooterLink to="/about" className="">About Us</FooterLink>
                            </li>
                            <li>
                                <FooterLink to="/contact" className="">Contact Us</FooterLink>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold mb-4">Legal</h3>
                        <ul className="space-y-2">
                            <li>
                                <FooterLink to="/privacy" className="">Privacy Policy</FooterLink>
                            </li>
                            <li>
                                <FooterLink to="/terms" className="">Terms of Service</FooterLink>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-800 py-8 mt-16">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <p className="text-gray-400">
                            &copy; {new Date().getFullYear()} Invoicy. All rights reserved.
                        </p>
                        <div className="flex space-x-4">
                            <SocialLink href="https://twitter.com/yourprofile">
                                <Twitter className="w-5 h-5" />
                            </SocialLink>
                            <SocialLink href="#">
                                <Github className="w-5 h-5" />
                            </SocialLink>
                            <SocialLink href="https://www.linkedin.com/in/yourprofile/">
                                <Linkedin className="w-5 h-5" />
                            </SocialLink>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};


export default Footer;