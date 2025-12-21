/**
 * @fileoverview Mobile Navigation Component
 * @description Mobile-optimized navigation with slide-out menu
 * @author Quiz Application Team
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { zIndexClasses } from '@/utils/zIndex';
import { 
  Menu, 
  X, 
  Home, 
  Plus, 
  FolderOpen, 
  Search, 
  MessageCircle, 
  Music, 
  User, 
  Wand2,
  LogOut 
} from 'lucide-react';

/**
 * Mobile Navigation Component
 * @description Provides mobile-friendly navigation with hamburger menu
 * @returns {JSX.Element|null} Mobile navigation or null on desktop
 */
export const MobileNavigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Only render on mobile devices
  if (!isMobile || !user) {
    return null;
  }

  /**
   * Handle navigation and close menu
   * @param path - Route path to navigate to
   */
  const handleNavigation = (path: string): void => {
    navigate(path);
    setIsOpen(false);
  };

  /**
   * Handle user logout
   */
  const handleLogout = async (): Promise<void> => {
    try {
      await signOut();
      setIsOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  /**
   * Check if current route is active
   * @param path - Route path to check
   * @returns Boolean indicating if route is active
   */
  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Hamburger Menu Button - Fixed top-right */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed top-4 right-4 ${zIndexClasses.fixedElements} w-12 h-12 bg-terminal border-2 border-terminal-accent rounded-lg flex items-center justify-center hover:bg-terminal-accent/10 transition-colors touch-target`}
        aria-label="Open navigation menu"
      >
        <Menu className="w-6 h-6 text-terminal-accent" />
      </button>

      {/* Mobile Slide-out Menu */}
      {isOpen && (
        <div className={`fixed inset-0 ${zIndexClasses.modals}`}>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
          />
          
          {/* Slide-out Panel */}
          <div className="fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-terminal border-l-2 border-terminal-accent shadow-xl overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-terminal-accent/30">
              <div>
                <h2 className="text-xl font-bold text-terminal-bright">QuizForge</h2>
                <p className="text-sm text-terminal-dim">Hello, {user.username}!</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 bg-terminal-accent/20 border border-terminal-accent rounded-lg flex items-center justify-center hover:bg-terminal-accent/30 transition-colors touch-target"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-terminal-accent" />
              </button>
            </div>
            
            {/* Navigation Links */}
            <nav className="p-6 space-y-2">
              <MobileNavLink 
                to="/dashboard" 
                icon={<Home className="w-5 h-5" />}
                onClick={() => handleNavigation('/dashboard')}
                isActive={isActiveRoute('/dashboard')}
              >
                Dashboard
              </MobileNavLink>
              
              <MobileNavLink 
                to="/create" 
                icon={<Plus className="w-5 h-5" />}
                onClick={() => handleNavigation('/create')}
                isActive={isActiveRoute('/create')}
              >
                Create Quiz
              </MobileNavLink>
              
              <MobileNavLink 
                to="/ai-generator" 
                icon={<Wand2 className="w-5 h-5" />}
                onClick={() => handleNavigation('/ai-generator')}
                isActive={isActiveRoute('/ai-generator')}
              >
                AI Generator
              </MobileNavLink>
              
              <MobileNavLink 
                to="/my-quizzes" 
                icon={<FolderOpen className="w-5 h-5" />}
                onClick={() => handleNavigation('/my-quizzes')}
                isActive={isActiveRoute('/my-quizzes')}
              >
                My Quizzes
              </MobileNavLink>
              
              <MobileNavLink 
                to="/browse-quizzes" 
                icon={<Search className="w-5 h-5" />}
                onClick={() => handleNavigation('/browse-quizzes')}
                isActive={isActiveRoute('/browse-quizzes')}
              >
                Browse Quizzes
              </MobileNavLink>
              
              <MobileNavLink 
                to="/chat" 
                icon={<MessageCircle className="w-5 h-5" />}
                onClick={() => handleNavigation('/chat')}
                isActive={isActiveRoute('/chat')}
              >
                Chat
              </MobileNavLink>
              
              <MobileNavLink 
                to="/music-library" 
                icon={<Music className="w-5 h-5" />}
                onClick={() => handleNavigation('/music-library')}
                isActive={isActiveRoute('/music-library')}
              >
                Music Library
              </MobileNavLink>
              
              <MobileNavLink 
                to={`/profile/${user.username}`} 
                icon={<User className="w-5 h-5" />}
                onClick={() => handleNavigation(`/profile/${user.username}`)}
                isActive={isActiveRoute(`/profile/${user.username}`)}
              >
                Profile
              </MobileNavLink>
              
              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 text-left border border-red-500/30 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors touch-target-large"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Mobile Navigation Link Component
 * @description Individual navigation link for mobile menu
 */
interface MobileNavLinkProps {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
}

const MobileNavLink: React.FC<MobileNavLinkProps> = ({ 
  to, 
  icon, 
  children, 
  onClick, 
  isActive 
}) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 text-left border rounded-lg transition-colors touch-target-large ${
      isActive 
        ? 'border-terminal-accent bg-terminal-accent/20 text-terminal-bright' 
        : 'border-terminal-accent/30 hover:bg-terminal-accent/10 text-terminal-foreground hover:text-terminal-bright'
    }`}
  >
    <span className={isActive ? 'text-terminal-accent' : 'text-terminal-dim'}>
      {icon}
    </span>
    <span className="font-medium">{children}</span>
  </button>
);