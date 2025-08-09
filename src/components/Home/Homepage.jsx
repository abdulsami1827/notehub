import React, { useState, useEffect } from "react";
import { BookOpen, Users, Upload, Award, Globe, TrendingUp, Star, ArrowRight, ChevronRight, Play, CheckCircle } from "lucide-react";
import Navbar from "./Navbar";
import LoginModal from "./LoginModal";
import useLenis from "../../services/useLenis";
import { saveContactMessage } from "../../services/firestoreService";

const Homepage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useLenis();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    nickname: '', // honeypot field
  });
  const [formStatus, setFormStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', or null
  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000); // hide after 5s
      return () => clearTimeout(timer);
    }
  }, [status]);


  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const canSendMessage = () => {
    const lastSent = localStorage.getItem("lastContactTime");
    const now = Date.now();
    if (!lastSent) return true;

    const cooldown = 5 * 60 * 1000; // 5 minutes
    return now - parseInt(lastSent, 10) > cooldown;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, email, message, nickname } = formData;

    if (nickname.trim() !== "") {
      return; 
    }

    if (!isValidEmail(email)) {
      setStatus("error");
      setFeedbackMessage("Please enter a valid email.");
      return;
    }

    if (!canSendMessage()) {
      setStatus("error");
      setFeedbackMessage("Please wait a few minutes before sending another message.");
      return;
    }

    try {
      await saveContactMessage({ name, email, message });
      localStorage.setItem("lastContactTime", Date.now().toString());
      setStatus("success");
      setFeedbackMessage("Message sent successfully!");
      setFormData({
        name: '',
        email: '',
        message: '',
        nickname: '',
      });
    } catch (err) {
      setStatus("error");
      setFeedbackMessage("Something went wrong. Please try again.");
    }
  };


  const handleLogin = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
  };

  const handleStartClick = () => {
    if (isLoggedIn) {
        window.location.href = "/dashboard";
    } else {
        setShowLoginModal(true);
    }
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  const features = [
    {
      icon: <Upload className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Easy Upload",
      description: "Upload your notes in seconds and help your peers learn faster. Drag and drop or browse files.",
      color: "from-violet-500 to-purple-600"
    },
    {
      icon: <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Smart Organization",
      description: "AI-powered categorization sorts notes by subject, difficulty, and relevance automatically.",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: <Users className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Collaborative Learning",
      description: "Connect with classmates, form study groups, and learn together in real-time.",
      color: "from-green-500 to-teal-600"
    },
    {
      icon: <Award className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Quality Assurance",
      description: "Community-driven ratings and expert reviews ensure only the best content.",
      color: "from-orange-500 to-red-600"
    }
  ];

  const stats = [
    { number: "50,000+", label: "Notes Shared", icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { number: "15,000+", label: "Active Students", icon: <Users className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { number: "200+", label: "Universities", icon: <Globe className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { number: "4.9/5", label: "Average Rating", icon: <Star className="w-5 h-5 sm:w-6 sm:h-6" /> }
  ];

  const steps = [
    {
      step: "01",
      title: "Create Account",
      description: "Sign up with your university email to join your campus community."
    },
    {
      step: "02", 
      title: "Browse & Search",
      description: "Find notes by subject, professor, or course code using our smart search."
    },
    {
      step: "03",
      title: "Download & Study",
      description: "Access high-quality notes instantly and boost your academic performance."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      university: "Stanford University",
      major: "Computer Science",
      rating: 5,
      text: "NoteHub saved my semester! Found amazing CS notes that helped me ace my algorithms exam.",
      avatar: "bg-gradient-to-r from-pink-400 to-rose-500"
    },
    {
      name: "Marcus Johnson", 
      university: "MIT",
      major: "Physics",
      rating: 5,
      text: "The collaborative features are incredible. Study groups have never been this organized.",
      avatar: "bg-gradient-to-r from-blue-400 to-cyan-500"
    },
    {
      name: "Emily Rodriguez",
      university: "Harvard",
      major: "Pre-Med",
      rating: 5,
      text: "Quality of notes here is unmatched. Detailed, accurate, and beautifully formatted.",
      avatar: "bg-gradient-to-r from-green-400 to-emerald-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-900/10 via-purple-800/5 to-pink-900/10 animate-pulse"></div>
      
      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/10 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      <Navbar 
        isLoggedIn={isLoggedIn} 
        setIsLoggedIn={setIsLoggedIn} 
        onLoginClick={handleLoginClick}
      />

      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 text-center relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-xs sm:text-sm text-white/80 mb-6 sm:mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            <span className="hidden sm:inline">Join 15,000+ students already using NoteHub</span>
            <span className="sm:hidden">15,000+ students using NoteHub</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 leading-tight">
            <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Your Study Success
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Starts Here
            </span>
          </h1>
          
          <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4 sm:px-0">
            Access thousands of high-quality study notes from top students at your university. 
            Share knowledge, collaborate with peers, and achieve academic excellence together.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center px-4 sm:px-0">
            <button 
              onClick={handleStartClick}
              className="group w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-semibold text-base sm:text-lg hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 min-h-[56px] flex items-center justify-center"
            >
              Start Learning Free
              <ArrowRight className="inline-block ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="mt-12 sm:mt-16 text-white/40 text-xs sm:text-sm">
            Trusted by students from 200+ universities worldwide
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="group bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/10 text-center hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105"
            >
              <div className="flex justify-center mb-3 sm:mb-4 text-violet-400 group-hover:text-violet-300 transition-colors">
                {stat.icon}
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">{stat.number}</div>
              <div className="text-white/70 group-hover:text-white/90 transition-colors text-xs sm:text-sm lg:text-base">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              Everything You Need to Excel
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-3xl mx-auto px-4 sm:px-0">
              Powerful features designed to enhance your learning experience and academic performance
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105"
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 flex items-center justify-center bg-gradient-to-r ${feature.color} rounded-xl sm:rounded-2xl mb-4 sm:mb-6 text-white group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 group-hover:text-purple-200 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-white/70 group-hover:text-white/90 transition-colors leading-relaxed text-sm sm:text-base">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">How It Works</h2>
            <p className="text-base sm:text-lg lg:text-xl text-white/70">Get started in three simple steps</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {steps.map((step, i) => (
              <div key={i} className="text-center group relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl mb-4 sm:mb-6 mx-auto group-hover:scale-110 transition-transform">
                  {step.step}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">{step.title}</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-base">{step.description}</p>
                
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">What Students Say</h2>
            <p className="text-base sm:text-lg lg:text-xl text-white/70">Real feedback from real students</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${testimonial.avatar} rounded-full flex items-center justify-center text-white font-semibold mr-3 sm:mr-4 text-sm sm:text-base`}>
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm sm:text-base">{testimonial.name}</div>
                    <div className="text-white/60 text-xs sm:text-sm">{testimonial.major}</div>
                    <div className="text-white/60 text-xs sm:text-sm">{testimonial.university}</div>
                  </div>
                </div>
                
                <div className="flex items-center mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-white/80 leading-relaxed text-sm sm:text-base">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-20 lg:py-24 px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Let’s Talk!
          </h2>
          <p className="text-white/70 text-base sm:text-lg mb-10">
            Got questions, feedback, or ideas? We’d love to hear from you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 max-w-xl mx-auto text-left">
            <input
              type="text"
              name="name"
              required
              placeholder="Your Name"
              className="w-full px-5 py-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              value={formData.name}
              onChange={handleChange}
            />
            <input
              type="email"
              name="email"
              required
              placeholder="Your Email"
              className="w-full px-5 py-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              value={formData.email}
              onChange={handleChange}
            />
            <textarea
              name="message"
              required
              placeholder="Your Message"
              rows="5"
              className="w-full px-5 py-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
              value={formData.message}
              onChange={handleChange}
            ></textarea>

            {/* Honeypot anti-bot trap */}
            <input
              type="text"
              name="nickname"
              className="hidden"
              value={formData.nickname}
              onChange={handleChange}
              autoComplete="off"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-semibold text-lg hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>

            {status && (
              <div
                className={`p-3 rounded-md text-white font-medium ${
                  status === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {feedbackMessage}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 sm:py-16 px-4 sm:px-6 border-t border-white/10 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  NoteHub
                </span>
              </div>
              <p className="text-white/60 leading-relaxed text-sm sm:text-base">
                Empowering students worldwide to share knowledge and achieve academic success together.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Product</h4>
              <div className="space-y-2">
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-xs sm:text-sm">Features</a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-xs sm:text-sm">API</a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-xs sm:text-sm">Mobile App</a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h4>
              <div className="space-y-2">
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-xs sm:text-sm">Help Center</a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-xs sm:text-sm">Contact Us</a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-xs sm:text-sm">Community</a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-xs sm:text-sm">Status</a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Legal</h4>
              <div className="space-y-2">
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-xs sm:text-sm">Privacy Policy</a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-xs sm:text-sm">Terms of Service</a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-xs sm:text-sm">Cookie Policy</a>
              </div>
            </div>
          </div>
          
          <div className="pt-6 sm:pt-8 border-t border-white/10 text-center text-white/50 text-xs sm:text-sm">
            © 2025 NoteHub. All rights reserved. Made with ❤️ for students everywhere.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;