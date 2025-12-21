import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import DOMPurify from 'dompurify';
import katex from 'katex';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface EquationEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string; // LaTeX without surrounding $...$
  onSave: (newValue: string) => void;
  anchor?: { x: number; y: number } | null;
  sourceId?: string; // optional source identifier for runtime warnings
}

const ITEMS: {tab:string;label:string;code:string}[] = [
  // Algebra
  {tab:'Algebra', label:'frac', code:'\\frac{•}{•}'},
  {tab:'Algebra', label:'dfrac', code:'\\dfrac{•}{•}'},
  {tab:'Algebra', label:'tfrac', code:'\\tfrac{•}{•}'},
  {tab:'Algebra', label:'sqrt', code:'\\sqrt{•}'},
  {tab:'Algebra', label:'nth root', code:'\\sqrt[•]{•}'},
  {tab:'Algebra', label:'abs', code:'|•|'},
  {tab:'Algebra', label:'ceil', code:'\\lceil • \\rceil'},
  {tab:'Algebra', label:'floor', code:'\\lfloor • \\rfloor'},
  // Functions / Transforms
  {tab:'Functions', label:'f(x)', code:'f(x)'},
  {tab:'Functions', label:'g(x)', code:'g(x)'},
  {tab:'Functions', label:'composition', code:'f( g(•) )'},
  {tab:'Functions', label:'Laplace', code:'\\mathcal{L}\\{ • \\}'},
  {tab:'Functions', label:'Laplace^{-1}', code:'\\mathcal{L}^{-1}\\{ • \\}'},
  {tab:'Functions', label:'Fourier', code:'\\mathcal{F}\\{ • \\}'},
  {tab:'Functions', label:'Fourier^{-1}', code:'\\mathcal{F}^{-1}\\{ • \\}'},
  {tab:'Functions', label:'Z-transform', code:'\\mathcal{Z}\\{ • \\}'},
  {tab:'Functions', label:'Z^{-1}', code:'\\mathcal{Z}^{-1}\\{ • \\}'},
  {tab:'Functions', label:'convolution', code:'(f \\ast g)(t) = \\int_{-\\infty}^{\\infty} f(\\tau) g(t-\\tau) \\, d\\tau'},
  {tab:'Functions', label:'u(t)', code:'u(t)'},
  {tab:'Functions', label:'δ(t)', code:'\\delta(t)'},
  {tab:'Functions', label:'r(t)', code:'r(t)'},
  {tab:'Functions', label:'sgn(t)', code:'\\operatorname{sgn}(t)'},
  // Calculus
  {tab:'Calculus', label:'d/dx', code:'\\frac{d}{dx} \\left( • \\right)'},
  {tab:'Calculus', label:'d^2/dx^2', code:'\\frac{d^{2}}{dx^{2}} \\left( • \\right)'},
  {tab:'Calculus', label:'d^n/dx^n', code:'\\frac{d^{•}}{dx^{•}} \\left( • \\right)'},
  {tab:'Calculus', label:'∂/∂x', code:'\\frac{\\partial}{\\partial x} \\left( • \\right)'},
  {tab:'Calculus', label:'∂^2/∂x^2', code:'\\frac{\\partial^{2}}{\\partial x^{2}} \\left( • \\right)'},
  {tab:'Calculus', label:'∂^2/∂x∂y', code:'\\frac{\\partial^{2}}{\\partial x \\partial y} \\left( • \\right)'},
  {tab:'Calculus', label:'∇f', code:'\\nabla \\! f'},
  {tab:'Calculus', label:'div', code:'\\nabla \\cdot \\mathbf{F}'},
  {tab:'Calculus', label:'curl', code:'\\nabla \\times \\mathbf{F}'},
  {tab:'Calculus', label:'laplacian', code:'\\nabla^{2} f'},
  {tab:'Calculus', label:'Δf', code:'\\Delta f'},
  {tab:'Calculus', label:'∫', code:'\\int_{•}^{•} • \\, dx'},
  {tab:'Calculus', label:'∬', code:'\\iint_{•}^{•} • \\, dx \\, dy'},
  {tab:'Calculus', label:'∭', code:'\\iiint_{•}^{•} • \\, dx \\, dy \\, dz'},
  {tab:'Calculus', label:'∮', code:'\\oint_{C} • \\cdot d\\mathbf{r}'},
  {tab:'Calculus', label:'lim', code:'\\lim_{x \\to •} •'},
  {tab:'Calculus', label:'Taylor', code:'\\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^{n}'},
  {tab:'Calculus', label:'Maclaurin', code:'\\sum_{n=0}^{\\infty} \\frac{f^{(n)}(0)}{n!} x^{n}'},
  {tab:'Calculus', label:'Gamma Γ', code:'\\Gamma(•)'},
  {tab:'Calculus', label:'Beta B', code:'B(•,•)'},
  {tab:'Calculus', label:'erf', code:'\\mathrm{erf}(•)'},
  // Linear Algebra
  {tab:'Linear', label:'pmatrix n×m', code:'\\begin{pmatrix} • \\end{pmatrix}'},
  {tab:'Linear', label:'bmatrix n×m', code:'\\begin{bmatrix} • \\end{bmatrix}'},
  {tab:'Linear', label:'Bmatrix n×m', code:'\\begin{Bmatrix} • \\end{Bmatrix}'},
  {tab:'Linear', label:'vmatrix n×m', code:'\\begin{vmatrix} • \\end{vmatrix}'},
  {tab:'Linear', label:'Vmatrix n×m', code:'\\begin{Vmatrix} • \\end{Vmatrix}'},

  {tab:'Linear', label:'det(A)', code:'\\det(A)'},
  {tab:'Linear', label:'tr(A)', code:'\\operatorname{tr}(A)'},
  {tab:'Linear', label:'rank(A)', code:'\\operatorname{rank}(A)'},
  {tab:'Linear', label:'nullity(A)', code:'\\operatorname{nullity}(A)'},
  {tab:'Linear', label:'diag', code:'\\operatorname{diag}(•)'},
  {tab:'Linear', label:'Av=λv', code:'A \\mathbf{v} = \\lambda \\mathbf{v}'},
  {tab:'Linear', label:'|A-λI|=0', code:'\\left| A - \\lambda I \\right| = 0'},
  {tab:'Linear', label:'||x||_p', code:'\\| x \\|_{•}'},
  {tab:'Linear', label:'||A||_F', code:'\\| A \\|_{F}'},
  {tab:'Linear', label:'A^{-1}', code:'A^{-1}'},
  {tab:'Linear', label:'A^{T}', code:'A^{T}'},
  {tab:'Linear', label:'A^{H}', code:'A^{H}'},
  {tab:'Linear', label:'[A|b]', code:'\\left[ A \\mid b \\right]'},
  // Greek / Accents / Symbols / Sets
  {tab:'Greek', label:'alpha', code:'\\alpha'},
  {tab:'Greek', label:'beta', code:'\\beta'},
  {tab:'Greek', label:'gamma', code:'\\gamma'},
  {tab:'Greek', label:'delta', code:'\\delta'},
  {tab:'Greek', label:'theta', code:'\\theta'},
  {tab:'Greek', label:'lambda', code:'\\lambda'},
  {tab:'Greek', label:'mu', code:'\\mu'},
  {tab:'Greek', label:'pi', code:'\\pi'},
  {tab:'Greek', label:'sigma', code:'\\sigma'},
  {tab:'Accents', label:'hat', code:'\\hat{•}'},
  {tab:'Accents', label:'bar', code:'\\bar{•}'},
  {tab:'Accents', label:'tilde', code:'\\tilde{•}'},
  {tab:'Symbols', label:'∞', code:'\\infty'},
  {tab:'Symbols', label:'ℝ', code:'\\mathbb{R}'},
  {tab:'Symbols', label:'ℤ', code:'\\mathbb{Z}'},
  {tab:'Symbols', label:'ℚ', code:'\\mathbb{Q}'},
  {tab:'Symbols', label:'ℂ', code:'\\mathbb{C}'},
  {tab:'Symbols', label:'ℕ', code:'\\mathbb{N}'},
  {tab:'Symbols', label:'P(A)', code:'\\mathbb{P}(A)'},
  {tab:'Symbols', label:'P(A|B)', code:'\\mathbb{P}(A \\mid B)'},
  {tab:'Symbols', label:'E[X]', code:'\\mathbb{E}[X]'},
  {tab:'Symbols', label:'Var(X)', code:'\\operatorname{Var}(X)'},
  {tab:'Symbols', label:'Cov(X,Y)', code:'\\operatorname{Cov}(X,Y)'},
  {tab:'Symbols', label:'N(μ,σ^2)', code:'\\mathcal{N}(\\mu, \\sigma^{2})'},
  {tab:'Symbols', label:'Bernoulli(p)', code:'\\operatorname{Bernoulli}(p)'},
  {tab:'Symbols', label:'Binomial(n,p)', code:'\\operatorname{Binomial}(n,p)'},
  {tab:'Symbols', label:'Poisson(λ)', code:'\\operatorname{Poisson}(\\lambda)'},
  {tab:'Symbols', label:'Uniform(a,b)', code:'\\operatorname{Uniform}(a,b)'},
  {tab:'Symbols', label:'Exponential(λ)', code:'\\operatorname{Exponential}(\\lambda)'},
  {tab:'Symbols', label:'argmax', code:'\\operatorname*{argmax}_{•} •'},
  {tab:'Symbols', label:'argmin', code:'\\operatorname*{argmin}_{•} •'},
  // Operators/Relations/Arrows
  {tab:'Operators', label:'±', code:'\\pm'},
  {tab:'Operators', label:'∓', code:'\\mp'},
  {tab:'Relations', label:'≈', code:'\\approx'},
  {tab:'Relations', label:'≃', code:'\\simeq'},
  {tab:'Relations', label:'≅', code:'\\cong'},
  {tab:'Relations', label:'≤', code:'\\leq'},
  {tab:'Relations', label:'≥', code:'\\geq'},
  {tab:'Relations', label:'≠', code:'\\neq'},
  {tab:'Relations', label:'∝', code:'\\propto'},
  {tab:'Relations', label:'≪', code:'\\ll'},
  {tab:'Relations', label:'≫', code:'\\gg'},
  {tab:'Arrows', label:'→', code:'\\to'},
  {tab:'Arrows', label:'←', code:'\\leftarrow'},
  {tab:'Arrows', label:'⇒', code:'\\Rightarrow'},
  {tab:'Arrows', label:'⇐', code:'\\Leftarrow'},
  {tab:'Arrows', label:'↦', code:'\\mapsto'},
  {tab:'Arrows', label:'↑', code:'\\uparrow'},
  {tab:'Arrows', label:'↓', code:'\\downarrow'},
  // Brackets (left/right pairs)
 {tab:'Symbols', label:'( )', code:'\\left( • \\right)'},
 {tab:'Symbols', label:'[ ]', code:'\\left[ • \\right]'},
 {tab:'Symbols', label:'{ }', code:'\\left\\{ • \\right\\}'},
 {tab:'Symbols', label:'⟨ ⟩', code:'\\left\\langle • \\right\\rangle'},
 {tab:'Symbols', label:'|| ||', code:'\\left\\| • \\right\\|'},
 {tab:'Symbols', label:'⌈ ⌉', code:'\\left\\lceil • \\right\\rceil'},
 {tab:'Symbols', label:'⌊ ⌋', code:'\\left\\lfloor • \\right\\rfloor'},

 // Set theory
 {tab:'Symbols', label:'A∪B', code:'A \\cup B'},
 {tab:'Symbols', label:'A∩B', code:'A \\cap B'},
 {tab:'Symbols', label:'A\\B', code:'A \\setminus B'},
 {tab:'Symbols', label:'A⊆B', code:'A \\subseteq B'},
 {tab:'Symbols', label:'A⊂B', code:'A \\subset B'},
 {tab:'Symbols', label:'A⊇B', code:'A \\supseteq B'},
 {tab:'Symbols', label:'A⊃B', code:'A \\supset B'},
 {tab:'Symbols', label:'x∈A', code:'x \\in A'},
 {tab:'Symbols', label:'x∉A', code:'x \\notin A'},
 {tab:'Symbols', label:'{ x∈A | }', code:'\\left\\{ x \\in A \\mid • \\right\\}'},
 {tab:'Symbols', label:'|A|', code:'\\left| A \\right|'},

// Linear Algebra (duplicate original items under new tab + advanced)
{tab:'Linear Algebra', label:'pmatrix n×m', code:'\\begin{pmatrix} • \\end{pmatrix}'},
{tab:'Linear Algebra', label:'bmatrix n×m', code:'\\begin{bmatrix} • \\end{bmatrix}'},
{tab:'Linear Algebra', label:'Bmatrix n×m', code:'\\begin{Bmatrix} • \\end{Bmatrix}'},
{tab:'Linear Algebra', label:'vmatrix n×m', code:'\\begin{vmatrix} • \\end{vmatrix}'},
{tab:'Linear Algebra', label:'Vmatrix n×m', code:'\\begin{Vmatrix} • \\end{Vmatrix}'},
{tab:'Linear Algebra', label:'det(A)', code:'\\det(A)'},
{tab:'Linear Algebra', label:'tr(A)', code:'\\operatorname{tr}(A)'},
{tab:'Linear Algebra', label:'rank(A)', code:'\\operatorname{rank}(A)'},
{tab:'Linear Algebra', label:'nullity(A)', code:'\\operatorname{nullity}(A)'},
{tab:'Linear Algebra', label:'diag', code:'\\operatorname{diag}(•)'},
{tab:'Linear Algebra', label:'Av=λv', code:'A \\mathbf{v} = \\lambda \\mathbf{v}'},
{tab:'Linear Algebra', label:'|A-λI|=0', code:'\\left| A - \\lambda I \\right| = 0'},
{tab:'Linear Algebra', label:'||x||_p', code:'\\| x \\|_{•}'},
{tab:'Linear Algebra', label:'||A||_F', code:'\\| A \\|_{F}'},
{tab:'Linear Algebra', label:'A^{-1}', code:'A^{-1}'},
{tab:'Linear Algebra', label:'A^{T}', code:'A^{T}'},
{tab:'Linear Algebra', label:'A^{H}', code:'A^{H}'},
{tab:'Linear Algebra', label:'[A|b]', code:'\\left[ A \\mid b \\right]'},
{tab:'Linear Algebra', label:'Vector v', code:'\\vec{v}'},
{tab:'Linear Algebra', label:'Bold v', code:'\\mathbf{v}'},
{tab:'Linear Algebra', label:'Column vec', code:'\\begin{bmatrix} • \\ \\ • \\end{bmatrix}'},
{tab:'Linear Algebra', label:'Projection', code:'\\operatorname{proj}_{\\mathbf{u}}(\\mathbf{v})'},
{tab:'Linear Algebra', label:'Gram-Schmidt', code:'\\operatorname{GS}(\\mathbf{v}_1, \\dots, \\mathbf{v}_n)'},
{tab:'Linear Algebra', label:'SVD', code:'A = U \\Sigma V^{T}'},
{tab:'Linear Algebra', label:'Eigen decomp', code:'A = PDP^{-1}'},

// Cases / Align
{tab:'Cases/Align', label:'cases (2 rows)', code:'\\begin{cases} •, & • \\\\ •, & • \\end{cases}'},
{tab:'Cases/Align', label:'aligned (2 eqns)', code:'\\begin{aligned} • &= • \\\\ • &= • \\end{aligned}'},
{tab:'Cases/Align', label:'piecewise', code:'f(x) = \\begin{cases} •, & x < • \\\\ •, & x \\ge • \\end{cases}'},

];

export const EquationEditorFloating: React.FC<EquationEditorProps> = ({ open, onOpenChange, value, onSave, anchor, sourceId }) => {
  const [latex, setLatex] = useState<string>(value || '');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('eqEditor.lastTab') || 'Algebra');
  const [mathMode, setMathMode] = useState<'inline'|'display'>(() => (localStorage.getItem('eqEditor.mathMode') as any) || 'inline');
  const [fontSize, setFontSize] = useState<'Small'|'Medium'|'Large'>(() => (localStorage.getItem('eqEditor.fontSize') as any) || 'Medium');
  const taRef = useRef<HTMLTextAreaElement|null>(null);
  const isMobile = useIsMobile();
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(() => localStorage.getItem('eqEditor.leftCollapsed') === 'true');
  const [symbolsCollapsed, setSymbolsCollapsed] = useState<boolean>(() => {
    const stored = localStorage.getItem('eqEditor.symbolsCollapsed');
    return stored ? stored === 'true' : false; // default show symbols for better UX
  });
  // Enhanced undo/redo history with granular tracking
  const [history, setHistory] = useState<string[]>([value || '']);
  const [histIndex, setHistIndex] = useState<number>(0);
  const lastChangeTime = useRef<number>(Date.now());
  const isTyping = useRef<boolean>(false);

 // Persisted layouts for resizers
 const [outerLayout, setOuterLayout] = useState<number[] | undefined>(() => {
   try { return JSON.parse(localStorage.getItem('eqEditor.layout.outer') || 'null') || undefined; } catch { return undefined; }
 });
 const [innerHLayout, setInnerHLayout] = useState<number[] | undefined>(() => {
   try { return JSON.parse(localStorage.getItem('eqEditor.layout.innerH') || 'null') || undefined; } catch { return undefined; }
 });
 const [innerVLayout, setInnerVLayout] = useState<number[] | undefined>(() => {
   try { return JSON.parse(localStorage.getItem('eqEditor.layout.innerV') || 'null') || undefined; } catch { return undefined; }
 });

 // Sidebar toggle with layout persistence
 const toggleLeftCollapsed = () => {
   if (!leftCollapsed) {
     if (outerLayout && outerLayout.length === 2) {
       try { localStorage.setItem('eqEditor.layout.outer.last', JSON.stringify(outerLayout)); } catch {}
     }
     setLeftCollapsed(true);
     setOuterLayout([0, 100]);
     try { localStorage.setItem('eqEditor.layout.outer', JSON.stringify([0, 100])); } catch {}
   } else {
     setLeftCollapsed(false);
     let restore: number[] | undefined = undefined;
     try { restore = JSON.parse(localStorage.getItem('eqEditor.layout.outer.last') || 'null') || [26, 74]; } catch {}
     if (restore) {
       setOuterLayout(restore);
       try { localStorage.setItem('eqEditor.layout.outer', JSON.stringify(restore)); } catch {}
     }
   }
 };

 const isApplyingHistory = useRef(false);
  const commitTimer = useRef<number | null>(null);
  const pushHistory = (next: string, forceCommit: boolean = false) => {
    if (isApplyingHistory.current) return;
    
    const now = Date.now();
    const timeDiff = now - lastChangeTime.current;
    const prev = history[histIndex] || '';
    
    // Smart grouping: commit changes if:
    // 1. Force commit (like symbol insertion)
    // 2. Time gap > 1 second (pause in typing)
    // 3. Major change (word boundary, LaTeX command)
    // 4. Different change type (typing vs insertion)
    const shouldCommit = forceCommit || 
      timeDiff > 1000 ||
      /\\[a-zA-Z]+/.test(next) !== /\\[a-zA-Z]+/.test(prev) ||
      (prev.length > 0 && next.length > prev.length + 5);
    
    if (shouldCommit || !isTyping.current) {
      setHistory(prevHist => {
        const cut = prevHist.slice(0, histIndex + 1);
        const base = cut[cut.length-1];
        const merged = base === next ? cut : [...cut, next];
        return merged.length > 500 ? merged.slice(1) : merged;
      });
      setHistIndex(i => Math.min(i + 1, 499));
      isTyping.current = timeDiff < 1000 && next.length > prev.length;
    } else {
      // Update current history entry for continuous typing
      setHistory(prevHist => {
        const newHist = [...prevHist];
        newHist[histIndex] = next;
        return newHist;
      });
      isTyping.current = true;
    }
    
    lastChangeTime.current = now;
  };
  const undo = () => { if (histIndex > 0) { const i = histIndex - 1; isApplyingHistory.current = true; setHistIndex(i); setLatex(history[i]); setTimeout(()=>{ isApplyingHistory.current=false; taRef.current?.focus(); },0); } };
  const redo = () => { if (histIndex < history.length - 1) { const i = histIndex + 1; isApplyingHistory.current = true; setHistIndex(i); setLatex(history[i]); setTimeout(()=>{ isApplyingHistory.current=false; taRef.current?.focus(); },0); } };


  useEffect(()=> localStorage.setItem('eqEditor.lastTab', activeTab), [activeTab]);
  useEffect(()=> localStorage.setItem('eqEditor.mathMode', mathMode), [mathMode]);
  useEffect(()=> localStorage.setItem('eqEditor.fontSize', fontSize), [fontSize]);
  useEffect(()=> localStorage.setItem('eqEditor.leftCollapsed', String(leftCollapsed)), [leftCollapsed]);
  useEffect(()=> localStorage.setItem('eqEditor.symbolsCollapsed', String(symbolsCollapsed)), [symbolsCollapsed]);

  useEffect(() => { if (open) { setLatex(value || ''); setHistory([value || '']); setHistIndex(0);} }, [open, value]);
useEffect(()=>{
  if (open && sourceId && sourceId !== 'LatexRenderer') {
    console.warn('[EquationEditor] Opened from unexpected source:', sourceId);
  }
}, [open, sourceId]);
  useEffect(()=>{
    if (open && sourceId && sourceId !== 'LatexRenderer') {
      console.warn('[EquationEditor] Opened from unexpected source:', sourceId);
    }
  }, [open, sourceId]);
  // Global shortcuts when editor open
  useEffect(()=>{
    if(!open) return;
    const handler = (e: KeyboardEvent) => {
      // Undo/Redo
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z' && !e.shiftKey){ e.preventDefault(); undo(); return; }
      if(((e.ctrlKey && e.key.toLowerCase()==='y') || ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key.toLowerCase()==='z'))){ e.preventDefault(); redo(); return; }
      // Save/Cancel
      if((e.ctrlKey||e.metaKey) && e.key==='Enter'){ e.preventDefault(); onSave(latex); onOpenChange(false); return; }
      if(e.key==='Escape'){ e.preventDefault(); onOpenChange(false); return; }
      // Zoom
      if((e.ctrlKey||e.metaKey) && (e.key==='=' || e.key==='+')){ e.preventDefault(); setFontSize(fs=> fs==='Small'?'Medium':fs==='Medium'?'Large':'Large'); return; }
      if((e.ctrlKey||e.metaKey) && e.key==='-'){ e.preventDefault(); setFontSize(fs=> fs==='Large'?'Medium':fs==='Medium'?'Small':'Small'); return; }
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  }, [open, latex, onSave, onOpenChange, histIndex, history]);

  const previewHtml = useMemo(() => {
    try {
      const html = katex.renderToString(latex || '', { throwOnError: false, strict: 'warn', displayMode: mathMode==='display' });
      return DOMPurify.sanitize(html, { KEEP_CONTENT: true });
    } catch {
      return '<span class="text-red-500">Invalid LaTeX</span>';
    }
  }, [latex, mathMode]);

  const insert = (snippet: string) => {
    const ta = taRef.current; const s = ta?.selectionStart ?? latex.length; const e = ta?.selectionEnd ?? s;
    const next = latex.slice(0, s) + snippet + latex.slice(e);
    setLatex(next);
    pushHistory(next, true); // Force commit for symbol insertions
    setTimeout(() => {
      if (ta) { const pos = s + snippet.length; ta.focus(); ta.setSelectionRange(pos, pos); }
    }, 0);
  };

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const margin = 8;

  const [winPos, setWinPos] = useState<{left:number; top:number}>(() => {
    try {
      const raw = localStorage.getItem('eqEditor.window.pos');
      if (raw) return JSON.parse(raw);
    } catch {}
    const initLeft = Math.min(Math.max((anchor?.x ?? vw/2) - 450, margin), Math.max(vw - 900 - margin, margin));
    const initTop = Math.min(Math.max((anchor?.y ?? vh/2) + 8, margin), Math.max(vh - 520 - margin, margin));
    return { left: initLeft, top: initTop };
  });
  const [winSize, setWinSize] = useState<{width:number; height:number}>(() => {
    try {
      const raw = localStorage.getItem('eqEditor.window.size');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { width: Math.min(900, vw - margin*2), height: Math.min(600, vh - margin*2) };
  });
  const [dragging, setDragging] = useState<boolean>(false);
  const [resizing, setResizing] = useState<null | 'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw'>(null);
  const dragOffset = useRef<{dx:number; dy:number}>({dx:0, dy:0});
  
  // Matrix builder state
  const [matrixBuilderOpen, setMatrixBuilderOpen] = useState<boolean>(false);
  const [matrixRows, setMatrixRows] = useState<number>(2);
  const [matrixCols, setMatrixCols] = useState<number>(2);
  const [matrixType, setMatrixType] = useState<string>('pmatrix');
  const [matrixData, setMatrixData] = useState<string[][]>(() => 
    Array(2).fill(null).map(() => Array(2).fill(''))
  );

  // Matrix helper functions
  const updateMatrixSize = (newRows: number, newCols: number) => {
    setMatrixRows(newRows);
    setMatrixCols(newCols);
    setMatrixData(prev => {
      const newData = Array(newRows).fill(null).map((_, r) => 
        Array(newCols).fill(null).map((_, c) => 
          prev[r] && prev[r][c] !== undefined ? prev[r][c] : ''
        )
      );
      return newData;
    });
  };

  const updateMatrixCell = (row: number, col: number, value: string) => {
    setMatrixData(prev => {
      const newData = [...prev];
      newData[row] = [...newData[row]];
      newData[row][col] = value;
      return newData;
    });
  };

  const insertMatrix = () => {
    const body = matrixData.map(row => row.join(' & ')).join(' \\\\\\\\ ');
    insert(`\\\\begin{${matrixType}} ${body} \\\\end{${matrixType}}`);
    setMatrixBuilderOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault(); // Prevent text selection during drag/resize
      if (dragging) {
        const left = Math.min(Math.max(e.clientX - dragOffset.current.dx, margin), Math.max(vw - winSize.width - margin, margin));
        const top = Math.min(Math.max(e.clientY - dragOffset.current.dy, margin), Math.max(vh - winSize.height - margin, margin));
        setWinPos({ left, top });
      } else if (resizing) {
        setWinSize(prev => {
          let { width, height } = prev;
          let { left, top } = winPos;
          const minW = 480, minH = 360;
          if (resizing.includes('e')) width = Math.min(Math.max( e.clientX - left, minW), vw - left - margin);
          if (resizing.includes('s')) height = Math.min(Math.max( e.clientY - top, minH), vh - top - margin);
          if (resizing.includes('w')) {
            const newLeft = Math.min(Math.max(e.clientX, margin), left + width - minW);
            width = left + width - newLeft;
            left = newLeft;
          }
          if (resizing.includes('n')) {
            const newTop = Math.min(Math.max(e.clientY, margin), top + height - minH);
            height = top + height - newTop;
            top = newTop;
          }
          setWinPos({ left, top });
          return { width, height };
        });
      }
    };
    const onDown = () => {
      // Disable text selection during drag operations
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    };
    const onUp = () => {
      if (dragging) setDragging(false);
      if (resizing) setResizing(null);
      // Re-enable text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      try { localStorage.setItem('eqEditor.window.pos', JSON.stringify(winPos)); } catch {}
      try { localStorage.setItem('eqEditor.window.size', JSON.stringify(winSize)); } catch {}
    };
    
    if (dragging || resizing) {
      onDown();
    }
    
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      // Cleanup: re-enable text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [open, dragging, resizing, winPos, winSize, vw, vh]);

  useEffect(() => {
    // If anchor changes while open, optionally reposition near it
    if (anchor) {
      setWinPos(prev => ({ left: prev.left, top: Math.min(Math.max(anchor.y + 8, margin), Math.max(vh - winSize.height - margin, margin)) }));
    }
  }, [anchor]);

  // Early return after all hooks
  if (!open) return null;

  const filtered = ITEMS.filter(i => (activeTab ? i.tab===activeTab : true) && (search ? (i.label.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase())) : true));

  const content = (
    <div className="fixed inset-0 z-[99999]" onMouseDown={() => { /* capture */ }}>
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      <div
        className="absolute bg-terminal border border-terminal-accent/60 shadow-2xl rounded-lg p-0 flex flex-col"
        style={{ left: winPos.left, top: winPos.top, width: winSize.width, height: winSize.height }}
        onClick={(e)=>e.stopPropagation()}
      >
        {/* Header (drag handle) */}
        <div
          className="px-4 py-2 border-b border-terminal-accent/30 flex items-center gap-2 cursor-move select-none bg-terminal/80 backdrop-blur"
          onMouseDown={(e)=>{ 
            e.preventDefault(); 
            setDragging(true); 
            dragOffset.current = { dx: e.clientX - winPos.left, dy: e.clientY - winPos.top }; 
          }}
        >
          <div className="text-lg font-semibold">Edit Equation</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={()=> setSymbolsCollapsed(c=>!c)}>{symbolsCollapsed ? 'Show Symbols' : 'Hide Symbols'}</Button>
            <Button variant="secondary" size="sm" onClick={toggleLeftCollapsed}>{leftCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}</Button>
            <Button variant={mathMode==='inline'?'default':'secondary'} size="sm" onClick={()=>setMathMode('inline')}>Inline</Button>
            <Button variant={mathMode==='display'?'default':'secondary'} size="sm" onClick={()=>setMathMode('display')}>Display</Button>
            <Button variant="secondary" size="sm" title="Cycle font size" onClick={()=> setFontSize(fs=> fs==='Small'?'Medium':fs==='Medium'?'Large':'Small')}>A↕</Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { onSave(latex); onOpenChange(false); }}>Save</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 p-3 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full" layout={outerLayout} onLayout={(sizes)=>{ setOuterLayout(sizes as number[]); try{ localStorage.setItem('eqEditor.layout.outer', JSON.stringify(sizes)); }catch{} }}>
          <ResizablePanel collapsible collapsed={leftCollapsed} onCollapse={setLeftCollapsed} collapsedSize={0} defaultSize={26} minSize={12} maxSize={40} className="border border-terminal-accent/30 rounded overflow-hidden bg-terminal">
            <div className="w-full h-full p-2 flex flex-col">
              <div className="text-xs text-terminal-dim mb-1 flex items-center">
                <span>Categories</span>
                <Button variant="ghost" size="sm" className="ml-auto" title={leftCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggleLeftCollapsed}>
                  {leftCollapsed ? '»' : '«'}
                </Button>
              </div>
              <div className="flex flex-col gap-1 text-xs mb-3 flex-1 overflow-auto pr-1">
                {['Algebra','Functions','Calculus','Greek','Operators','Relations','Arrows','Linear Algebra','Cases/Align','Accents','Symbols'].map(tab => (
                  <button key={tab} onClick={()=>setActiveTab(tab)} className={`px-2 py-1 rounded border ${activeTab===tab?'bg-terminal-accent/20 border-terminal-accent/60 text-terminal-bright':'border-terminal-accent/30 text-terminal-dim hover:bg-terminal-accent/10'}`}>{tab}</button>
                ))}
              </div>
              <div className="text-xs text-terminal-dim">Use the symbols bar on the right</div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={leftCollapsed ? 100 : 82} minSize={50} className="pl-3 overflow-hidden bg-terminal relative z-0">
            {/* Inner split: Symbols palette (left) | Editor (right) - collapsible symbols */}
            {symbolsCollapsed ? (
              <div className="h-full">
                <ResizablePanelGroup direction="vertical" className="h-full min-h-[240px]">
                  <ResizablePanel defaultSize={50} minSize={25} className="overflow-auto">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                      <span>LaTeX Source</span>
                      <div className="ml-auto flex items-center gap-1">
                        <Button variant="secondary" size="sm" title="Undo (Ctrl/Cmd+Z)" onClick={undo}>Undo</Button>
                        <Button variant="secondary" size="sm" title="Redo (Ctrl+Y or Ctrl/Cmd+Shift+Z)" onClick={redo}>Redo</Button>
                      </div>
                    </div>
                    <Textarea ref={taRef} id="equ-editor" value={latex} onChange={(e) => setLatex(e.target.value)} rows={8} className={`w-full h-full min-h-[140px] bg-terminal text-terminal-bright border border-terminal-accent/60 rounded ${fontSize==='Small'?'text-sm':fontSize==='Large'?'text-lg':'text-base'}`} />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={50} minSize={25} className="overflow-auto">
                    <div className="text-xs text-muted-foreground mb-1">Live Preview</div>
                    <div className={`min-h-32 p-3 rounded border border-terminal-accent/60 bg-terminal text-terminal-bright ${fontSize==='Small'?'text-sm':fontSize==='Large'?'text-lg':'text-base'}`} dangerouslySetInnerHTML={{ __html: previewHtml }} title="LaTeX Preview - Content sanitized with DOMPurify" />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full" layout={innerHLayout} onLayout={(sizes)=>{ setInnerHLayout(sizes as number[]); try{ localStorage.setItem('eqEditor.layout.innerH', JSON.stringify(sizes)); }catch{} }}>
              {/* Symbols panel (collapsible via header button) */}
              <ResizablePanel defaultSize={30} minSize={18} maxSize={50} className="pr-3 border-r border-terminal-accent/30 relative z-10">
                <div className="flex items-center gap-2 mb-2" onKeyDown={(e)=>{
                  const ta = taRef.current;
                  // Undo/Redo
                  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z' && !e.shiftKey){ e.preventDefault(); undo(); return; }
                  if(((e.ctrlKey && e.key.toLowerCase()==='y') || ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key.toLowerCase()==='z'))){ e.preventDefault(); redo(); return; }
                  // Save/Cancel
                  if(e.key==='Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) { e.preventDefault(); onSave(latex); onOpenChange(false); return; }
                  if(e.key==='Escape'){ e.preventDefault(); onOpenChange(false); return; }
                  // Font zoom
                  if((e.ctrlKey||e.metaKey) && (e.key==='=' || e.key==='+')){ e.preventDefault(); setFontSize(fs=> fs==='Small'?'Medium':fs==='Medium'?'Large':'Large'); return; }
                  if((e.ctrlKey||e.metaKey) && e.key==='-'){ e.preventDefault(); setFontSize(fs=> fs==='Large'?'Medium':fs==='Medium'?'Small':'Small'); return; }
                  // Placeholder Tab navigation
                  if(e.key==='Tab'){
                    e.preventDefault();
                    const s = ta?.selectionStart ?? 0; const t = latex;
                    if(e.shiftKey){
                      const prev = t.lastIndexOf('•', Math.max(0, s-1));
                      if(prev !== -1){ setTimeout(()=>{ ta?.focus(); ta?.setSelectionRange(prev, prev); }, 0); }
                    } else {
                      const next = t.indexOf('•', s+1);
                      if(next !== -1){ setTimeout(()=>{ ta?.focus(); ta?.setSelectionRange(next, next); }, 0); }
                    }
                    return;
                  }
                }}>
                  <Input placeholder="Search symbols or commands" value={search} onChange={(e)=>setSearch(e.target.value)} className="h-8 w-[240px]" />
                  {/* Matrix generator only on Linear Algebra tab */}
                  {activeTab==='Linear Algebra' && (
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={()=>{
                        setMatrixBuilderOpen(true);
                      }}>Matrix Builder</Button>
                      <Button variant="secondary" size="sm" onClick={()=>{
                        const env = window.prompt('Matrix type (pmatrix, bmatrix, Bmatrix, vmatrix, Vmatrix):', 'pmatrix')?.trim() || 'pmatrix';
                        const rowsStr = window.prompt('Number of rows (1-15):', '2');
                        const colsStr = window.prompt('Number of cols (1-15):', '2');
                        const rows = Math.min(15, Math.max(1, parseInt(rowsStr||'2', 10)));
                        const cols = Math.min(15, Math.max(1, parseInt(colsStr||'2', 10)));
                        if(!['pmatrix','bmatrix','Bmatrix','vmatrix','Vmatrix'].includes(env)) { alert('Invalid matrix type'); return; }
                        const body = Array.from({length:rows}).map(()=> Array.from({length:cols}).map(()=> '•').join(' & ')).join(' \\\\\\\\ ');
                        insert(`\\\\begin{${env}} ${body} \\\\end{${env}}`);
                      }}>Quick Matrix</Button>
                    </div>
                  )}
                  <div className="ml-auto" />
                </div>
                <div className="flex flex-wrap gap-2 text-sm mb-2 max-h-[calc(100%-2rem)] overflow-auto pr-1">
                  {filtered.map((it, idx) => (
                    <Button key={idx} variant="secondary" size="sm" onClick={()=>insert(it.code)}>{it.label}</Button>
                  ))}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle className="z-20" />
              {/* Editor panel */}
              <ResizablePanel defaultSize={70} minSize={40} className="overflow-hidden relative z-0">
                {/* Vertical split: Source (top) / Preview (bottom) */}
                <ResizablePanelGroup direction="vertical" className="h-full">
                  <ResizablePanel defaultSize={50} minSize={25} className="overflow-auto">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                      <span>LaTeX Source</span>
                      <div className="ml-auto flex items-center gap-1">
                        <Button variant="secondary" size="sm" title="Undo (Ctrl/Cmd+Z)" onClick={undo}>Undo</Button>
                        <Button variant="secondary" size="sm" title="Redo (Ctrl+Y or Ctrl/Cmd+Shift+Z)" onClick={redo}>Redo</Button>
                      </div>
                    </div>
                    <Textarea ref={taRef} id="equ-editor" value={latex} onChange={(e) => setLatex(e.target.value)} rows={8} className={`w-full h-full min-h-[140px] bg-terminal text-terminal-bright border border-terminal-accent/60 rounded ${fontSize==='Small'?'text-sm':fontSize==='Large'?'text-lg':'text-base'}`} />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={50} minSize={25} className="overflow-auto">
                    <div className="text-xs text-muted-foreground mb-1">Live Preview</div>
                    <div className={`min-h-32 p-3 rounded border border-terminal-accent/60 bg-terminal text-terminal-bright ${fontSize==='Small'?'text-sm':fontSize==='Large'?'text-lg':'text-base'}`} dangerouslySetInnerHTML={{ __html: previewHtml }} title="LaTeX Preview - Content sanitized with DOMPurify" />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
        </div>
       {/* Resize handles */}
       <div className="absolute inset-x-2 top-0 h-2 cursor-n-resize select-none" onMouseDown={(e)=> { e.preventDefault(); setResizing('n'); }}></div>
       <div className="absolute inset-x-2 bottom-0 h-2 cursor-s-resize select-none" onMouseDown={(e)=> { e.preventDefault(); setResizing('s'); }}></div>
       <div className="absolute inset-y-2 right-0 w-2 cursor-e-resize select-none" onMouseDown={(e)=> { e.preventDefault(); setResizing('e'); }}></div>
       <div className="absolute inset-y-2 left-0 w-2 cursor-w-resize select-none" onMouseDown={(e)=> { e.preventDefault(); setResizing('w'); }}></div>
       <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize select-none" onMouseDown={(e)=> { e.preventDefault(); setResizing('ne'); }}></div>
       <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize select-none" onMouseDown={(e)=> { e.preventDefault(); setResizing('nw'); }}></div>
       <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize select-none" onMouseDown={(e)=> { e.preventDefault(); setResizing('se'); }}></div>
       <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize select-none" onMouseDown={(e)=> { e.preventDefault(); setResizing('sw'); }}></div>
     </div>
   </div>
 );

 // Matrix Builder Modal
 const matrixBuilderModal = matrixBuilderOpen && (
   <div className="fixed inset-0 z-[99998] flex items-center justify-center">
     <div className="absolute inset-0 bg-black/70" onClick={() => setMatrixBuilderOpen(false)} />
     <div className="relative bg-terminal border border-terminal-accent/60 rounded-lg p-6 max-w-2xl w-full mx-4">
       <div className="flex items-center justify-between mb-4">
         <h3 className="text-lg font-semibold">Matrix Builder</h3>
         <Button variant="ghost" size="sm" onClick={() => setMatrixBuilderOpen(false)}>✕</Button>
       </div>
       
       <div className="grid grid-cols-3 gap-4 mb-4">
         <div>
           <label className="text-xs text-muted-foreground">Matrix Type</label>
           <select value={matrixType} onChange={(e) => setMatrixType(e.target.value)} className="w-full mt-1 p-2 bg-terminal border border-terminal-accent/60 rounded">
             <option value="pmatrix">( ) parentheses</option>
             <option value="bmatrix">[ ] brackets</option>
             <option value="Bmatrix">{ } braces</option>
             <option value="vmatrix">| | determinant</option>
             <option value="Vmatrix">|| || norm</option>
           </select>
         </div>
         <div>
           <label className="text-xs text-muted-foreground">Rows</label>
           <Input type="number" min="1" max="10" value={matrixRows} onChange={(e) => updateMatrixSize(parseInt(e.target.value) || 2, matrixCols)} className="mt-1" />
         </div>
         <div>
           <label className="text-xs text-muted-foreground">Columns</label>
           <Input type="number" min="1" max="10" value={matrixCols} onChange={(e) => updateMatrixSize(matrixRows, parseInt(e.target.value) || 2)} className="mt-1" />
         </div>
       </div>

       <div className="mb-4">
         <label className="text-xs text-muted-foreground mb-2 block">Matrix Elements</label>
         <div className="grid gap-1 p-4 bg-terminal-accent/10 rounded border" style={{ gridTemplateColumns: `repeat(${matrixCols}, 1fr)` }}>
           {Array.from({length: matrixRows}).map((_, r) =>
             Array.from({length: matrixCols}).map((_, c) => (
               <Input
                 key={`${r}-${c}`}
                 value={matrixData[r]?.[c] || ''}
                 onChange={(e) => updateMatrixCell(r, c, e.target.value)}
                 placeholder={`a${r+1}${c+1}`}
                 className="text-center text-sm"
               />
             ))
           )}
         </div>
       </div>

       <div className="flex justify-end gap-2">
         <Button variant="ghost" onClick={() => setMatrixBuilderOpen(false)}>Cancel</Button>
         <Button onClick={insertMatrix}>Insert Matrix</Button>
       </div>
     </div>
   </div>
 );

 // Render via portal to avoid parent container constraints
 return typeof document !== 'undefined' ? createPortal(
   <>
     {content}
     {matrixBuilderModal}
   </>,
   document.body
 ) : null;
};
