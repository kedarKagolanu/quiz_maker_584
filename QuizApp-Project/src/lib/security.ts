import DOMPurify from 'dompurify';

/**
 * Security utilities for input sanitization and validation
 */

// LaTeX command whitelist for MathJax/KaTeX security
const ALLOWED_LATEX_COMMANDS = [
  // Math symbols and operators
  'frac', 'sqrt', 'sum', 'int', 'prod', 'lim', 'infty', 'partial', 'nabla',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa',
  'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  // Formatting
  'text', 'mathbf', 'mathit', 'mathrm', 'mathcal', 'mathbb', 'mathfrak', 'boldsymbol',
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg',
  // Structures
  'begin', 'end', 'array', 'matrix', 'pmatrix', 'bmatrix', 'vmatrix', 'cases',
  // Spacing
  'quad', 'qquad', 'hspace', 'vspace', 'phantom',
  // Relations
  'leq', 'geq', 'neq', 'approx', 'equiv', 'sim', 'cong', 'propto',
  // Sets
  'in', 'notin', 'subset', 'subseteq', 'supset', 'supseteq', 'cup', 'cap', 'emptyset',
  // Logic
  'land', 'lor', 'lnot', 'implies', 'iff', 'forall', 'exists',
  // Arrows
  'rightarrow', 'leftarrow', 'leftrightarrow', 'Rightarrow', 'Leftarrow', 'Leftrightarrow',
  // Misc
  'cdot', 'times', 'div', 'pm', 'mp', 'circ', 'bullet', 'star'
];

/**
 * Sanitize HTML content using DOMPurify
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'mark', 'small', 'del', 'ins', 'sub', 'sup', 'br', 'p', 'span', 'code'],
    ALLOWED_ATTR: ['class', 'style'],
    ALLOWED_STYLES: ['color', 'background-color', 'font-weight', 'font-style', 'text-decoration'],
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    SANITIZE_DOM: true,
    SANITIZE_NAMED_PROPS: true,
    KEEP_CONTENT: true
  });
};

/**
 * Sanitize LaTeX input for MathJax/KaTeX
 */
export const sanitizeLatex = (latex: string): string => {
  if (!latex || typeof latex !== 'string') {
    return '';
  }

  // Remove any script-like content
  let sanitized = latex
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  // Validate LaTeX commands
  const commandRegex = /\\([a-zA-Z]+)/g;
  sanitized = sanitized.replace(commandRegex, (match, command) => {
    if (ALLOWED_LATEX_COMMANDS.includes(command.toLowerCase())) {
      return match;
    }
    // Replace disallowed commands with safe text
    return `\\text{${command}}`;
  });

  // Remove potentially dangerous constructs
  sanitized = sanitized
    .replace(/\\input\{[^}]*\}/g, '') // Remove input commands
    .replace(/\\include\{[^}]*\}/g, '') // Remove include commands
    .replace(/\\write\d+\{[^}]*\}/g, '') // Remove write commands
    .replace(/\\catcode/g, '') // Remove catcode changes
    .replace(/\\def\\/g, '') // Remove definitions
    .replace(/\\let\\/g, ''); // Remove let assignments

  return sanitized;
};

/**
 * Sanitize quiz content including text and LaTeX
 */
export const sanitizeQuizContent = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Split content by LaTeX delimiters
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$|\\[\[\(][\s\S]*?\\[\]\)])/);
  
  return parts.map((part, index) => {
    // Check if this part is LaTeX
    if (part.match(/^\$\$[\s\S]*?\$\$$/) || part.match(/^\$[^$]*?\$$/) || part.match(/^\\[\[\(][\s\S]*?\\[\]\)]$/)) {
      return sanitizeLatex(part);
    } else {
      // Regular HTML content
      return sanitizeHtml(part);
    }
  }).join('');
};

/**
 * Sanitize user input for storage
 */
export const sanitizeUserInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
};

/**
 * Validate and sanitize file names
 */
export const sanitizeFileName = (fileName: string): string => {
  if (!fileName || typeof fileName !== 'string') {
    return 'untitled';
  }

  return fileName
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\.\./g, '') // Remove directory traversal
    .replace(/^\./, '') // Remove leading dot
    .trim()
    .substring(0, 255); // Limit length
};

/**
 * Sanitize error messages for production
 */
export const sanitizeErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    // Remove sensitive information from error messages
    return error
      .replace(/password/gi, '[REDACTED]')
      .replace(/token/gi, '[REDACTED]')
      .replace(/key/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]')
      .replace(/api[_-]?key/gi, '[REDACTED]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]') // Remove emails
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]') // Remove IP addresses
      .substring(0, 500); // Limit length
  }
  
  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message);
  }
  
  return 'An unexpected error occurred';
};

/**
 * Rate limiting utility (simple in-memory implementation)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  isAllowed(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  clear(): void {
    this.requests.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Simple rate limiting decorator for functions
 */
export const withRateLimit = <T extends (...args: any[]) => any>(
  fn: T, 
  maxRequests: number = 10, 
  windowMs: number = 60000, // 1 minute
  identifier: string = 'global'
): T => {
  return ((...args: any[]) => {
    if (!rateLimiter.isAllowed(identifier, maxRequests, windowMs)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    return fn(...args);
  }) as T;
};