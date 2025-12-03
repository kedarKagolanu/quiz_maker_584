/**
 * Quiz Template Selector Component
 * Pre-built quiz templates optimized for different subjects and use cases
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Calculator, Globe, Code, Heart, Atom, Gavel, Palette } from 'lucide-react';

interface QuizTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  defaultQuestions: number;
  defaultDifficulty: string;
  questionTypes: string;
  category: string;
}

const QUIZ_TEMPLATES: QuizTemplate[] = [
  {
    id: 'math-basic',
    name: 'Basic Mathematics',
    description: 'Arithmetic, algebra, geometry problems with step-by-step solutions',
    icon: <Calculator className="h-5 w-5" />,
    prompt: 'Create mathematical questions with clear explanations. Include LaTeX formatting for equations. Focus on problem-solving skills and provide detailed solution steps.',
    defaultQuestions: 15,
    defaultDifficulty: 'medium',
    questionTypes: 'mixed',
    category: 'STEM'
  },
  {
    id: 'science-general',
    name: 'General Science',
    description: 'Biology, chemistry, physics concepts with practical applications',
    icon: <Atom className="h-5 w-5" />,
    prompt: 'Focus on scientific concepts, experiments, and real-world applications. Include diagrams where helpful. Emphasize understanding over memorization.',
    defaultQuestions: 12,
    defaultDifficulty: 'medium',
    questionTypes: 'multiple-choice',
    category: 'STEM'
  },
  {
    id: 'programming',
    name: 'Programming & Code',
    description: 'Code analysis, debugging, algorithms, and best practices',
    icon: <Code className="h-5 w-5" />,
    prompt: 'Create programming questions with code snippets. Focus on logic, debugging, algorithms, and best practices. Include code examples in markdown format.',
    defaultQuestions: 10,
    defaultDifficulty: 'hard',
    questionTypes: 'mixed',
    category: 'STEM'
  },
  {
    id: 'history',
    name: 'Historical Events',
    description: 'Dates, causes, effects, and significance of historical events',
    icon: <BookOpen className="h-5 w-5" />,
    prompt: 'Create questions about historical events, their causes and effects. Focus on understanding significance rather than just memorizing dates.',
    defaultQuestions: 15,
    defaultDifficulty: 'medium',
    questionTypes: 'multiple-choice',
    category: 'Humanities'
  },
  {
    id: 'geography',
    name: 'World Geography',
    description: 'Countries, capitals, physical features, and cultural knowledge',
    icon: <Globe className="h-5 w-5" />,
    prompt: 'Focus on geographical knowledge including physical features, countries, capitals, and cultural aspects. Include both factual and analytical questions.',
    defaultQuestions: 20,
    defaultDifficulty: 'easy',
    questionTypes: 'multiple-choice',
    category: 'Social Studies'
  },
  {
    id: 'medical',
    name: 'Medical & Health',
    description: 'Anatomy, physiology, medical terminology, and health concepts',
    icon: <Heart className="h-5 w-5" />,
    prompt: 'Create medical and health-related questions focusing on anatomy, physiology, terminology, and clinical scenarios. Ensure accuracy for educational purposes.',
    defaultQuestions: 15,
    defaultDifficulty: 'hard',
    questionTypes: 'mixed',
    category: 'Medical'
  },
  {
    id: 'law',
    name: 'Legal Studies',
    description: 'Legal concepts, case law, constitutional principles',
    icon: <Gavel className="h-5 w-5" />,
    prompt: 'Focus on legal concepts, principles, case law, and constitutional matters. Include scenario-based questions for practical application.',
    defaultQuestions: 12,
    defaultDifficulty: 'hard',
    questionTypes: 'mixed',
    category: 'Legal'
  },
  {
    id: 'art-literature',
    name: 'Art & Literature',
    description: 'Literature analysis, art history, creative interpretation',
    icon: <Palette className="h-5 w-5" />,
    prompt: 'Create questions about literature, art history, and creative works. Focus on analysis, interpretation, and cultural significance.',
    defaultQuestions: 12,
    defaultDifficulty: 'medium',
    questionTypes: 'mixed',
    category: 'Arts'
  },
  {
    id: 'business',
    name: 'Business & Economics',
    description: 'Business concepts, economics, management, finance',
    icon: <BookOpen className="h-5 w-5" />,
    prompt: 'Focus on business concepts, economic principles, management strategies, and financial literacy. Include real-world scenarios.',
    defaultQuestions: 15,
    defaultDifficulty: 'medium',
    questionTypes: 'mixed',
    category: 'Business'
  },
  {
    id: 'custom',
    name: 'Custom Template',
    description: 'Create your own template with specific requirements',
    icon: <Code className="h-5 w-5" />,
    prompt: '',
    defaultQuestions: 10,
    defaultDifficulty: 'medium',
    questionTypes: 'mixed',
    category: 'Custom'
  }
];

interface QuizTemplateSelectorProps {
  onSelectTemplate: (template: QuizTemplate) => void;
  selectedTemplate: string;
}

export function QuizTemplateSelector({ onSelectTemplate, selectedTemplate }: QuizTemplateSelectorProps) {
  const categories = [...new Set(QUIZ_TEMPLATES.map(t => t.category))];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-terminal-bright mb-2">🎯 Quiz Templates</h3>
        <p className="text-sm text-muted-foreground">
          Choose a pre-optimized template for your subject area, or create a custom template
        </p>
      </div>

      {categories.map(category => (
        <div key={category} className="space-y-3">
          <h4 className="font-medium text-terminal-bright text-sm uppercase tracking-wide">
            {category}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUIZ_TEMPLATES.filter(template => template.category === category).map(template => (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate === template.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                    : 'hover:ring-1 hover:ring-gray-300'
                }`}
                onClick={() => onSelectTemplate(template)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {template.icon}
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-2">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1 text-xs">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                      {template.defaultQuestions}Q
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                      {template.defaultDifficulty}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                      {template.questionTypes}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}