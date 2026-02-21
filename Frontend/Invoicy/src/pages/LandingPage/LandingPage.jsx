import React from "react";
import Header from "../../components/landing/Header";
import Hero from "../../components/landing/Hero";
import Features from "../../components/landing/Features";
import Testimonials from "../../components/landing/Testimonials";
import Faq from "../../components/landing/Faq";
import TeamMembers from "../../components/landing/TeamMembers";
import Pricing from "../../components/landing/Pricing";
import Footer from "../../components/landing/Footer";


const LandingPage= () => {
  return (
    <div className="bg-[#ffffff] text-gray-600 min-h-screen">
      <Header />
      <main className="pt-16 lg:pt-20">
      {/* Landing page content goes here */}
      <Hero />
      <Features />
      <Testimonials />
      <Faq /> 
      <TeamMembers />
      <Pricing />
      <Footer />
      
      </main>
    </div>
  );
}; 

export default LandingPage;
