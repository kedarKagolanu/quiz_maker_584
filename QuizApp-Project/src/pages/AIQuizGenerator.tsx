/**
 * AI Quiz Generator - Dedicated Page
 * Advanced AI-powered quiz generation with competitive exam support
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, Wand2, FileText, Settings, Key, BookOpen, Plus, X, 
  Brain, Target, TrendingUp, BarChart3, Clock, Award, 
  Zap, Globe, Calculator, Code, Microscope
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Quiz, Question } from '@/types/quiz';
import { storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

// Enhanced AI Provider configuration with latest models
interface AIProvider {
  id: string;
  name: string;
  endpoint: string;
  keyPlaceholder: string;
  supportedModels: Array<{
    id: string;
    name: string;
    description: string;
    strengths: string[];
    bestFor: string[];
  }>;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyPlaceholder: 'sk-proj-... (Your OpenAI API Key)',
    supportedModels: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Latest multimodal model with enhanced reasoning',
        strengths: ['Reasoning', 'Math', 'Code', 'Analysis'],
        bestFor: ['GATE', 'CAT Quant', 'Programming', 'Technical subjects']
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast and cost-effective variant',
        strengths: ['Speed', 'Efficiency', 'General knowledge'],
        bestFor: ['Quick generation', 'General subjects', 'Large batches']
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Enhanced GPT-4 with better performance',
        strengths: ['Complex reasoning', 'Long context', 'Accuracy'],
        bestFor: ['CAT VARC', 'Complex analysis', 'Essay questions']
      }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyPlaceholder: 'sk-ant-... (Your Anthropic API Key)',
    supportedModels: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude-3.5 Sonnet (Latest)',
        description: 'Most advanced reasoning and analysis model',
        strengths: ['Superior reasoning', 'Mathematical analysis', 'Code generation'],
        bestFor: ['GATE', 'CAT', 'JEE Advanced', 'Complex problem solving']
      },
      {
        id: 'claude-3-5-sonnet-20240620',
        name: 'Claude-3.5 Sonnet (Stable)',
        description: 'Reliable version with consistent performance',
        strengths: ['Consistent output', 'Analytical thinking', 'Explanations'],
        bestFor: ['Study materials', 'Practice questions', 'Concept explanations']
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude-3 Opus',
        description: 'Highest capability model for complex tasks',
        strengths: ['Deep analysis', 'Creative thinking', 'Research'],
        bestFor: ['Research questions', 'Advanced topics', 'Comprehensive analysis']
      }
    ]
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    keyPlaceholder: 'AIza... (Your Google AI API Key)',
    supportedModels: [
      {
        id: 'gemini-1.5-pro-002',
        name: 'Gemini-1.5 Pro (Latest)',
        description: 'Google\'s most advanced model with 2M context',
        strengths: ['Long context', 'Multimodal', 'Research', 'Analysis'],
        bestFor: ['Document analysis', 'Research papers', 'Comprehensive content']
      },
      {
        id: 'gemini-1.5-flash-002',
        name: 'Gemini-1.5 Flash (Latest)',
        description: 'Fast and efficient with good performance',
        strengths: ['Speed', 'Efficiency', 'Quick responses'],
        bestFor: ['Quick generation', 'Practice tests', 'Rapid prototyping']
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini-1.0 Pro',
        description: 'Reliable general-purpose model',
        strengths: ['Balanced performance', 'Stability', 'General knowledge'],
        bestFor: ['General questions', 'Mixed subjects', 'Stable output']
      }
    ]
  }
];

// Competitive Exam Templates with specialized prompts
interface ExamTemplate {
  id: string;
  name: string;
  fullName: string;
  icon: React.ReactNode;
  description: string;
  subjects: string[];
  difficulty: string;
  timePerQuestion: number;
  questionTypes: string[];
  specialPrompts: {
    instructions: string;
    questionStyle: string;
    difficultyGuidance: string;
  };
  sampleTopics: string[];
}

const COMPETITIVE_EXAM_TEMPLATES: ExamTemplate[] = [
  {
    id: 'cat',
    name: 'CAT',
    fullName: 'Common Admission Test',
    icon: <Brain className="h-5 w-5" />,
    description: 'MBA entrance exam focusing on Quantitative Ability, VARC, and DILR',
    subjects: ['Quantitative Ability', 'Verbal Ability & Reading Comprehension', 'Data Interpretation & Logical Reasoning'],
    difficulty: 'high',
    timePerQuestion: 180, // 3 minutes
    questionTypes: ['multiple-choice', 'type-in-the-answer'],
    specialPrompts: {
      instructions: 'Create CAT-level questions with high difficulty and time pressure. Focus on application of concepts rather than direct formulas.',
      questionStyle: 'Questions should test analytical thinking and problem-solving speed. Include detailed explanations with shortcuts and tricks.',
      difficultyGuidance: 'Mix 30% easy, 40% medium, 30% difficult questions. Easy questions should be solvable in 1 minute, difficult ones may take 3-4 minutes.'
    },
    sampleTopics: ['Arithmetic', 'Algebra', 'Geometry', 'Reading Comprehension', 'Critical Reasoning', 'Data Sufficiency']
  },
  {
    id: 'gate',
    name: 'GATE',
    fullName: 'Graduate Aptitude Test in Engineering',
    icon: <Microscope className="h-5 w-5" />,
    description: 'Engineering entrance for MTech/PhD with technical depth',
    subjects: ['Mathematics', 'General Aptitude', 'Core Engineering Subject'],
    difficulty: 'high',
    timePerQuestion: 90, // 1.5 minutes
    questionTypes: ['multiple-choice', 'multiple-select', 'numerical-answer'],
    specialPrompts: {
      instructions: 'Create GATE-standard technical questions requiring deep understanding of engineering concepts. Include both theoretical and numerical problems.',
      questionStyle: 'Questions should test fundamental understanding and application. Include step-by-step solutions with engineering approach.',
      difficultyGuidance: 'Follow GATE pattern: easy (30%), medium (50%), hard (20%). Focus on concept clarity and problem-solving methodology.'
    },
    sampleTopics: ['Linear Algebra', 'Calculus', 'Digital Logic', 'Computer Networks', 'Algorithms', 'Probability']
  },
  {
    id: 'jee',
    name: 'JEE',
    fullName: 'Joint Entrance Examination',
    icon: <Calculator className="h-5 w-5" />,
    description: 'Engineering entrance focusing on Physics, Chemistry, Mathematics',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    difficulty: 'very-high',
    timePerQuestion: 72, // 1.2 minutes (for JEE Main)
    questionTypes: ['multiple-choice', 'numerical-value', 'multiple-correct'],
    specialPrompts: {
      instructions: 'Create JEE-level questions requiring strong conceptual understanding and mathematical skills. Include both single-correct and multi-correct types.',
      questionStyle: 'Questions should integrate multiple concepts and require analytical thinking. Provide detailed solutions with conceptual explanations.',
      difficultyGuidance: 'JEE Advanced level: 20% easy, 50% medium, 30% hard. Focus on concept integration and problem-solving techniques.'
    },
    sampleTopics: ['Mechanics', 'Thermodynamics', 'Organic Chemistry', 'Coordinate Geometry', 'Calculus', 'Probability']
  },
  {
    id: 'upsc',
    name: 'UPSC',
    fullName: 'Civil Services Examination',
    icon: <Globe className="h-5 w-5" />,
    description: 'Civil services exam covering diverse subjects and current affairs',
    subjects: ['General Studies', 'Current Affairs', 'Optional Subjects', 'Essay Writing'],
    difficulty: 'medium-high',
    timePerQuestion: 90, // 1.5 minutes
    questionTypes: ['multiple-choice', 'descriptive'],
    specialPrompts: {
      instructions: 'Create UPSC-standard questions covering current affairs, polity, economics, geography, and history. Focus on analytical and application-based questions.',
      questionStyle: 'Questions should test understanding of concepts and their real-world applications. Include factual, analytical, and opinion-based questions.',
      difficultyGuidance: 'UPSC prelims level with focus on current relevance and conceptual clarity. Balance factual recall with analytical thinking.'
    },
    sampleTopics: ['Indian Polity', 'Economics', 'Geography', 'Modern History', 'Science & Technology', 'Current Affairs']
  },
  {
    id: 'neet',
    name: 'NEET',
    fullName: 'National Eligibility Entrance Test',
    icon: <Award className="h-5 w-5" />,
    description: 'Medical entrance focusing on Biology, Physics, Chemistry',
    subjects: ['Biology', 'Physics', 'Chemistry'],
    difficulty: 'high',
    timePerQuestion: 72, // 1.2 minutes
    questionTypes: ['multiple-choice'],
    specialPrompts: {
      instructions: 'Create NEET-level questions focusing on NCERT concepts with application-based problems. Emphasize factual accuracy and concept clarity.',
      questionStyle: 'Questions should be NCERT-based with practical applications. Include diagrams and biological processes where relevant.',
      difficultyGuidance: 'NEET standard: 40% easy, 35% medium, 25% hard. Focus on concept understanding and factual accuracy.'
    },
    sampleTopics: ['Human Physiology', 'Genetics', 'Ecology', 'Mechanics', 'Optics', 'Organic Chemistry']
  }
];

export function AIQuizGeneratorPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State management
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [customEndpoint, setCustomEndpoint] = useState<string>('');
  
  // Content and settings
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(20);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [timeLimit, setTimeLimit] = useState<number>(90);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  
  // File and quiz sources
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [selectedQuizSources, setSelectedQuizSources] = useState<string[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);

  // Load available quizzes
  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const quizzes = await storage.getQuizzes();
        setAvailableQuizzes(quizzes);
      } catch (error) {
        console.error('Failed to load quizzes:', error);
      }
    };
    loadQuizzes();
  }, []);

  // Auto-configure when exam template is selected
  useEffect(() => {
    if (selectedExam) {
      const template = COMPETITIVE_EXAM_TEMPLATES.find(t => t.id === selectedExam);
      if (template) {
        setNumQuestions(selectedExam === 'cat' ? 30 : selectedExam === 'jee' ? 25 : 20);
        setTimeLimit(template.timePerQuestion);
        setCustomPrompt(template.specialPrompts.instructions);
        
        // Auto-select best AI model for exam type
        if (selectedExam === 'cat' || selectedExam === 'gate') {
          setSelectedProvider('anthropic');
          setSelectedModel('claude-3-5-sonnet-20241022');
        } else if (selectedExam === 'jee') {
          setSelectedProvider('openai');
          setSelectedModel('gpt-4o');
        }
        
        toast({
          title: `${template.fullName} template loaded`,
          description: `Optimized settings for ${template.name} preparation`,
        });
      }
    }
  }, [selectedExam, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* WIP Notice */}
        <div className="mb-6">
          <div className="p-4 border-2 border-yellow-400/60 bg-yellow-400/10 rounded text-yellow-300 font-semibold text-center">
            🚧 AI Generator - Work in Progress. Some features may not be available yet.
          </div>
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🤖 AI Quiz Generator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create professional quizzes using advanced AI models. Specialized templates for CAT, GATE, JEE, NEET, and other competitive exams.
          </p>
        </div>

        {/* Main Interface */}
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8">
              <TabsTrigger value="setup" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                AI Setup
              </TabsTrigger>
              <TabsTrigger value="exams" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Exam Templates
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content Sources
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced Settings
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Generate
              </TabsTrigger>
            </TabsList>

            {/* AI Setup Tab */}
            <TabsContent value="setup" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    AI Provider Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="provider">Choose AI Provider</Label>
                      <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select AI provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_PROVIDERS.map(provider => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedProvider && (
                      <div>
                        <Label htmlFor="model">Select Model</Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose model" />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_PROVIDERS.find(p => p.id === selectedProvider)?.supportedModels.map(model => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{model.name}</span>
                                  <span className="text-xs text-muted-foreground">{model.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  {selectedModel && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-blue-600 mt-1" />
                        <div>
                          <h4 className="font-medium text-blue-900 dark:text-blue-100">
                            {AI_PROVIDERS.find(p => p.id === selectedProvider)?.supportedModels.find(m => m.id === selectedModel)?.name}
                          </h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                            {AI_PROVIDERS.find(p => p.id === selectedProvider)?.supportedModels.find(m => m.id === selectedModel)?.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <div className="text-xs">
                              <span className="font-medium">Strengths:</span>
                              {AI_PROVIDERS.find(p => p.id === selectedProvider)?.supportedModels.find(m => m.id === selectedModel)?.strengths.map(strength => (
                                <Badge key={strength} variant="secondary" className="ml-1 text-xs">
                                  {strength}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={AI_PROVIDERS.find(p => p.id === selectedProvider)?.keyPlaceholder || "Enter your API key"}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      🔒 Your API key is only used for this session and never stored on our servers
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Exam Templates Tab */}
            <TabsContent value="exams" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Competitive Exam Templates
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Choose from specialized templates optimized for different competitive exams
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {COMPETITIVE_EXAM_TEMPLATES.map(exam => (
                      <Card 
                        key={exam.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          selectedExam === exam.id 
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                            : 'hover:ring-1 hover:ring-gray-300'
                        }`}
                        onClick={() => setSelectedExam(exam.id)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-3">
                            {exam.icon}
                            <div>
                              <div className="font-bold">{exam.name}</div>
                              <div className="text-sm font-normal text-muted-foreground">
                                {exam.fullName}
                              </div>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground mb-3">
                            {exam.description}
                          </p>
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {exam.subjects.slice(0, 2).map(subject => (
                                <Badge key={subject} variant="outline" className="text-xs">
                                  {subject}
                                </Badge>
                              ))}
                              {exam.subjects.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{exam.subjects.length - 2} more
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {Math.floor(exam.timePerQuestion / 60)}:{(exam.timePerQuestion % 60).toString().padStart(2, '0')} per question
                              <Separator orientation="vertical" className="h-3" />
                              <span className="capitalize">{exam.difficulty.replace('-', ' ')} level</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {selectedExam && (
                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-start gap-3">
                        <Award className="h-5 w-5 text-green-600 mt-1" />
                        <div>
                          <h4 className="font-medium text-green-900 dark:text-green-100">
                            {COMPETITIVE_EXAM_TEMPLATES.find(e => e.id === selectedExam)?.fullName} Template Selected
                          </h4>
                          <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                            Optimized settings loaded. AI model and parameters configured for best results.
                          </p>
                          <div className="mt-2">
                            <span className="text-xs font-medium">Sample Topics: </span>
                            {COMPETITIVE_EXAM_TEMPLATES.find(e => e.id === selectedExam)?.sampleTopics.slice(0, 3).map(topic => (
                              <Badge key={topic} variant="secondary" className="ml-1 text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Sources Tab */}
            <TabsContent value="content" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      File Upload
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="file-upload">Upload Study Materials</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mt-2">
                          <input
                            id="file-upload"
                            type="file"
                            multiple
                            accept=".pdf,.txt,.md,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              // Handle file upload logic here
                              const files = Array.from(e.target.files || []);
                              setUploadedFiles(prev => [...prev, ...files.map(f => f.name)]);
                              toast({
                                title: "Files uploaded",
                                description: `Added ${files.length} file(s)`,
                              });
                            }}
                          />
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            <Upload className="h-8 w-8 text-gray-400" />
                            <span className="text-sm text-gray-600 text-center">
                              📄 PDF, TXT, MD, DOC, DOCX<br/>
                              Click to upload or drag files here
                            </span>
                          </label>
                        </div>
                        
                        {uploadedFiles.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <span className="text-sm">{file}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="topic">Topic/Subject</Label>
                        <Input
                          id="topic"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder={selectedExam ? 
                            `e.g., ${COMPETITIVE_EXAM_TEMPLATES.find(e => e.id === selectedExam)?.sampleTopics[0]}` :
                            "Enter your topic"
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Quiz Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Use Existing Quizzes as Reference</Label>
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg mt-2">
                          {availableQuizzes.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No quizzes available
                            </div>
                          ) : (
                            <div className="space-y-2 p-3">
                              {availableQuizzes.map(quiz => (
                                <div key={quiz.id} className="flex items-center space-x-3">
                                  <Checkbox
                                    checked={selectedQuizSources.includes(quiz.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedQuizSources(prev => [...prev, quiz.id]);
                                      } else {
                                        setSelectedQuizSources(prev => prev.filter(id => id !== quiz.id));
                                      }
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{quiz.title}</p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {quiz.questions?.length || 0} questions
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Advanced Settings Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quiz Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="numQuestions">Number of Questions</Label>
                        <Select value={numQuestions.toString()} onValueChange={(v) => setNumQuestions(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 15, 20, 25, 30, 40, 50].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} questions
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="difficulty">Difficulty Level</Label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                            <SelectItem value="mixed">Mixed (Exam Pattern)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="timeLimit">Time per Question (seconds)</Label>
                      <Input
                        id="timeLimit"
                        type="number"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                        min={30}
                        max={300}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Custom Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Add specific instructions for the AI..."
                      rows={6}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Question Analysis & Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Generate a quiz to see detailed analytics and insights
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Generate Tab */}
            <TabsContent value="generate" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    Generate Quiz
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isGenerating && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        <span>Generating quiz...</span>
                      </div>
                      <Progress value={generationProgress} className="w-full" />
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => {
                      // Generation logic will be implemented
                      setIsGenerating(true);
                      setGenerationProgress(0);
                      // Simulate progress
                      const interval = setInterval(() => {
                        setGenerationProgress(prev => {
                          if (prev >= 100) {
                            clearInterval(interval);
                            setIsGenerating(false);
                            navigate('/create');
                            return 100;
                          }
                          return prev + 20;
                        });
                      }, 1000);
                    }}
                    disabled={!selectedProvider || !apiKey || !topic || isGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Generating Quiz...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Quiz with AI
                      </>
                    )}
                  </Button>
                  
                  <div className="text-sm text-muted-foreground text-center">
                    Your quiz will be generated and opened in the quiz editor for review
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}