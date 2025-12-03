/**
 * AI Quiz Generator Component
 * Allows users to generate quizzes using AI with their own API keys
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Wand2, FileText, Settings, Key, BookOpen, Plus, X } from 'lucide-react';
import { QuizTemplateSelector } from '@/components/QuizTemplateSelector';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Quiz, Question } from '@/types/quiz';
import { v4 as uuidv4 } from 'uuid';

interface AIProvider {
  id: string;
  name: string;
  endpoint: string;
  keyPlaceholder: string;
  supportedModels: string[];
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyPlaceholder: 'sk-proj-... (Your OpenAI API Key)',
    supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyPlaceholder: 'sk-ant-... (Your Anthropic API Key)',
    supportedModels: [
      'claude-3-5-sonnet-20241022', 
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229', 
      'claude-3-sonnet-20240229', 
      'claude-3-haiku-20240307'
    ]
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    keyPlaceholder: 'AIza... (Your Google AI API Key)',
    supportedModels: [
      'gemini-1.5-pro-002',
      'gemini-1.5-pro-001', 
      'gemini-1.5-flash-002',
      'gemini-1.5-flash-001',
      'gemini-1.0-pro'
    ]
  },
  {
    id: 'custom',
    name: 'Custom API Endpoint',
    endpoint: 'custom',
    keyPlaceholder: 'Your custom API key',
    supportedModels: ['custom-model']
  }
];

interface AIQuizGeneratorProps {
  onQuizGenerated: (quiz: Quiz) => void;
}

export function AIQuizGenerator({ onQuizGenerated }: AIQuizGeneratorProps) {
  const { toast } = useToast();
  
  // Form state
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [customEndpoint, setCustomEndpoint] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [questionTypes, setQuestionTypes] = useState<string>('mixed');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [uploadedContent, setUploadedContent] = useState<string>('');
  const [selectedQuizSources, setSelectedQuizSources] = useState<string[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [useTemplate, setUseTemplate] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Load available quizzes on component mount
  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const { storage } = await import('@/lib/storage');
        const quizzes = await storage.getQuizzes();
        setAvailableQuizzes(quizzes);
      } catch (error) {
        console.error('Failed to load quizzes:', error);
      }
    };
    loadQuizzes();
  }, []);

  // Enhanced file upload handling with PDF support
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    
    try {
      if (file.type === 'application/pdf') {
        // Import PDF parsing library dynamically
        const pdfParse = await import('pdf-parse');
        const arrayBuffer = await file.arrayBuffer();
        const data = await pdfParse.default(Buffer.from(arrayBuffer));
        
        setUploadedContent(data.text);
        toast({
          title: "PDF uploaded successfully",
          description: `Extracted ${Math.round(data.text.length / 1000)}k characters from ${file.name}`,
        });
      } else {
        // Handle text files
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setUploadedContent(content);
          toast({
            title: "File uploaded successfully", 
            description: `Loaded ${Math.round(content.length / 1000)}k characters from ${file.name}`,
          });
        };
        reader.readAsText(file);
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle quiz source selection
  const handleQuizSelection = (quizIds: string[]) => {
    setSelectedQuizSources(quizIds);
    
    if (quizIds.length > 0) {
      // Combine content from selected quizzes
      const selectedQuizContent = quizIds.map(id => {
        const quiz = availableQuizzes.find(q => q.id === id);
        if (!quiz) return '';
        
        const questionsText = quiz.questions.map(q => 
          `Q: ${q.question}\nA: ${Array.isArray(q.options) ? q.options.join(', ') : q.correctAnswer}`
        ).join('\n\n');
        
        return `=== ${quiz.title} ===\n${quiz.description || ''}\n\n${questionsText}`;
      }).join('\n\n');
      
      setUploadedContent(prev => 
        prev ? `${prev}\n\n=== EXISTING QUIZ CONTENT ===\n${selectedQuizContent}` 
            : selectedQuizContent
      );
      
      toast({
        title: "Quiz sources added",
        description: `Added ${quizIds.length} quiz${quizIds.length > 1 ? 'es' : ''} as source material`,
      });
    }
  };

  // Generate system prompt for AI
  const generateSystemPrompt = () => {
    const basePrompt = `You are a quiz generation expert. Generate a quiz in the following JSON format:

{
  "title": "Quiz Title",
  "description": "Brief description",
  "questions": [
    {
      "id": "unique-id",
      "type": "multiple-choice" | "true-false" | "short-answer",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"], // For multiple-choice only
      "correctAnswer": "correct answer or option index",
      "explanation": "Why this is correct (optional)",
      "difficulty": "easy" | "medium" | "hard",
      "timeLimit": 30 // seconds
    }
  ]
}

Requirements:
- Generate exactly ${numQuestions} questions
- Difficulty level: ${difficulty}
- Question types: ${questionTypes === 'mixed' ? 'mix of multiple-choice, true-false, and short-answer' : questionTypes}
- Make questions educational and engaging
- Ensure correct answers are accurate
- Include helpful explanations when possible`;

    return basePrompt;
  };

  // Generate user prompt combining inputs
  const generateUserPrompt = () => {
    let prompt = `Generate a quiz about: ${topic}\n\n`;
    
    if (uploadedContent) {
      prompt += `Based on this content:\n${uploadedContent.slice(0, 10000)}${uploadedContent.length > 10000 ? '...' : ''}\n\n`;
    }
    
    if (customPrompt) {
      prompt += `Additional requirements: ${customPrompt}\n\n`;
    }
    
    prompt += `Please create ${numQuestions} ${difficulty} difficulty questions in JSON format.`;
    
    return prompt;
  };

  // Call AI API to generate quiz
  const generateQuiz = async () => {
    if (!selectedProvider || !apiKey || !topic) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const provider = AI_PROVIDERS.find(p => p.id === selectedProvider)!;
      const systemPrompt = generateSystemPrompt();
      const userPrompt = generateUserPrompt();
      
      let response;
      
      if (selectedProvider === 'openai') {
        response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 4000
          })
        });
      } else if (selectedProvider === 'anthropic') {
        response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: selectedModel,
            max_tokens: 4000,
            messages: [
              { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
            ]
          })
        });
      } else if (selectedProvider === 'google') {
        const url = `${provider.endpoint}/${selectedModel}:generateContent?key=${apiKey}`;
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }]
          })
        });
      } else if (selectedProvider === 'custom') {
        // Handle custom endpoint
        const endpoint = customEndpoint || provider.endpoint;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 4000
          })
        });
      }

      if (!response?.ok) {
        throw new Error(`API call failed: ${response?.statusText}`);
      }

      const data = await response.json();
      
      // Extract content based on provider
      let content = '';
      if (selectedProvider === 'openai') {
        content = data.choices[0]?.message?.content || '';
      } else if (selectedProvider === 'anthropic') {
        content = data.content[0]?.text || '';
      } else if (selectedProvider === 'google') {
        content = data.candidates[0]?.content?.parts[0]?.text || '';
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const quizData = JSON.parse(jsonMatch[0]);
      
      // Create Quiz object
      const newQuiz: Quiz = {
        id: uuidv4(),
        title: quizData.title || `${topic} Quiz`,
        description: quizData.description || `AI-generated quiz about ${topic}`,
        questions: quizData.questions.map((q: any, index: number) => ({
          id: q.id || `question-${index}`,
          type: q.type || 'multiple-choice',
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty || difficulty,
          timeLimit: q.timeLimit || 30
        })),
        creator: 'ai-generated',
        createdAt: new Date().toISOString(),
        isPublic: false,
        timeLimit: numQuestions * 30,
        randomize: false,
        layout: 'default'
      };

      onQuizGenerated(newQuiz);
      
      toast({
        title: "Quiz generated successfully!",
        description: `Created ${newQuiz.questions.length} questions about ${topic}`,
      });
      
      // Reset form
      setTopic('');
      setCustomPrompt('');
      setUploadedContent('');
      
    } catch (error) {
      console.error('Quiz generation error:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const currentProvider = AI_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI Quiz Generator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Use your own AI API key to generate quizzes automatically
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Setup
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Quiz Sources
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="setup" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provider">AI Provider</Label>
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
              
              {currentProvider && (
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentProvider.supportedModels.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {currentProvider && (
              <>
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={currentProvider.keyPlaceholder}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your API key is only used for this session and never stored
                  </p>
                </div>
                
                {selectedProvider === 'custom' && (
                  <div>
                    <Label htmlFor="customEndpoint">Custom API Endpoint</Label>
                    <Input
                      id="customEndpoint"
                      value={customEndpoint}
                      onChange={(e) => setCustomEndpoint(e.target.value)}
                      placeholder="https://api.your-provider.com/v1/chat/completions"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your custom API endpoint URL
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="templates" className="space-y-4">
            <QuizTemplateSelector 
              onSelectTemplate={(template) => {
                setUseTemplate(template.id);
                setNumQuestions(template.defaultQuestions);
                setDifficulty(template.defaultDifficulty);
                setQuestionTypes(template.questionTypes);
                setCustomPrompt(template.prompt);
                toast({
                  title: "Template selected",
                  description: `Using ${template.name} template settings`,
                });
              }}
              selectedTemplate={useTemplate}
            />
          </TabsContent>
          
          <TabsContent value="content" className="space-y-4">
            <div>
              <Label htmlFor="topic">Topic/Subject *</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., World War II, Python Programming, Biology"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="file-upload">Upload Files (Multiple Formats Supported)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileUpload}
                  accept=".txt,.md,.doc,.docx,.pdf"
                  className="hidden"
                  multiple
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600 text-center">
                    📄 Support: PDF, TXT, MD, DOC, DOCX<br/>
                    Click to upload or drag files here
                  </span>
                </label>
              </div>
              {uploadedContent && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✓ Content loaded ({Math.round(uploadedContent.length / 1000)}k characters)
                  </p>
                  <button 
                    onClick={() => setUploadedContent('')}
                    className="text-xs text-red-600 hover:text-red-800 mt-1"
                  >
                    Clear content
                  </button>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="customPrompt">Additional Instructions (Optional)</Label>
              <Textarea
                id="customPrompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., Focus on practical applications, include code examples, make it suitable for beginners..."
                rows={3}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="quizzes" className="space-y-4">
            <div>
              <Label>Use Existing Quizzes as Source Material</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Select quizzes to use as reference material for generating new questions
              </p>
              
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {availableQuizzes.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No quizzes available. Create some quizzes first to use as sources.
                  </div>
                ) : (
                  <div className="space-y-2 p-3">
                    {availableQuizzes.map(quiz => (
                      <label key={quiz.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedQuizSources.includes(quiz.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQuizSources(prev => [...prev, quiz.id]);
                            } else {
                              setSelectedQuizSources(prev => prev.filter(id => id !== quiz.id));
                            }
                          }}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{quiz.title}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {quiz.questions?.length || 0} questions • {quiz.creator}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedQuizSources.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ✓ Selected {selectedQuizSources.length} quiz{selectedQuizSources.length > 1 ? 'es' : ''} as source material
                  </p>
                  <button 
                    onClick={() => handleQuizSelection(selectedQuizSources)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 underline"
                  >
                    Add to content now
                  </button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numQuestions">Number of Questions</Label>
                <Select value={numQuestions.toString()} onValueChange={(v) => setNumQuestions(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} questions
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="questionTypes">Question Types</Label>
                <Select value={questionTypes} onValueChange={setQuestionTypes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="true-false">True/False</SelectItem>
                    <SelectItem value="short-answer">Short Answer</SelectItem>
                    <SelectItem value="mixed">Mixed Types</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <Button 
          onClick={generateQuiz}
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
      </CardContent>
    </Card>
  );
}