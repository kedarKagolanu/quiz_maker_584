import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LatexRenderer } from '@/components/LatexRenderer';
import { renderMediaTags } from '@/lib/mediaRenderer';
import { ImprovedJsonEditor } from '@/components/ImprovedJsonEditor';
import { toast } from 'sonner';

interface RawJsonEditorProps {
  questions: any[];
  media?: any[];
  imageSize?: string;
  onQuestionsChange: (questions: any[]) => void;
}

export const RawJsonEditor: React.FC<RawJsonEditorProps> = ({
  questions,
  media = [],
  imageSize = 'medium',
  onQuestionsChange
}) => {
  const [rawJson, setRawJson] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);
  const [jsonError, setJsonError] = useState('');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  // Initialize JSON from questions
  useEffect(() => {
    setRawJson(JSON.stringify(questions, null, 2));
  }, [questions]);

  const validateAndParseJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of questions');
      }
      setIsValidJson(true);
      setJsonError('');
      return parsed;
    } catch (error) {
      setIsValidJson(false);
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
      return null;
    }
  };

  const handleJsonChange = (value: string) => {
    setRawJson(value);
    const parsed = validateAndParseJson(value);
    if (parsed) {
      onQuestionsChange(parsed);
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(rawJson);
      const formatted = JSON.stringify(parsed, null, 2);
      setRawJson(formatted);
      toast.success('JSON formatted successfully');
    } catch (error) {
      toast.error('Cannot format invalid JSON');
    }
  };

  const renderQuestionPreview = (question: any, index: number) => {
    if (!question) return <div>Invalid question data</div>;

    const questionText = question.q || question.question || '';
    const options = Array.isArray(question.o) ? question.o : (Array.isArray(question.options) ? question.options : []);
    const answer = question.a || question.answer || 0;

    return (
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h4 className="font-medium text-sm mb-2">Question {index + 1}</h4>
          
          {/* Question Text */}
          <div className="mb-4">
            <div className="text-sm font-medium mb-1">Question:</div>
            <div className="p-2 bg-gray-50 rounded text-sm">
              <LatexRenderer>
                {renderMediaTags(questionText, media, imageSize)}
              </LatexRenderer>
            </div>
          </div>

          {/* Options */}
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Options:</div>
            <div className="space-y-2">
              {options.map((option: any, optionIndex: number) => (
                <div 
                  key={optionIndex}
                  className={`p-2 rounded text-sm border ${
                    optionIndex === answer 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`font-medium ${optionIndex === answer ? 'text-green-600' : ''}`}>
                      {String.fromCharCode(65 + optionIndex)}.
                    </span>
                    <div className="flex-1">
                      <LatexRenderer>
                        {renderMediaTags(option, media, imageSize)}
                      </LatexRenderer>
                    </div>
                    {optionIndex === answer && (
                      <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded">
                        Correct
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const currentQuestions = validateAndParseJson(rawJson) || questions;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Raw JSON Editor</h3>
        <div className="flex gap-2">
          <Button onClick={formatJson} size="sm" variant="outline">
            Format JSON
          </Button>
          <div className="text-sm text-gray-600 flex items-center">
            {currentQuestions.length} questions
          </div>
        </div>
      </div>

      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">JSON Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          {!isValidJson && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>JSON Error:</strong> {jsonError}
              </AlertDescription>
            </Alert>
          )}

          <ImprovedJsonEditor
            value={rawJson}
            onChange={handleJsonChange}
            placeholder="Paste your quiz questions JSON here..."
            className="w-full"
            minHeight={400}
          />

          <div className="text-xs text-gray-500">
            <div className="mb-2"><strong>JSON Format:</strong></div>
            <code className="text-xs bg-gray-100 p-2 rounded block">
              {`[
  {
    "q": "What is 2 + 2?",
    "o": ["2", "3", "4", "5"],
    "a": 2
  }
]`}
            </code>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {currentQuestions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No questions to preview. Add valid JSON in the editor.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Question selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Preview Question:</span>
                <select 
                  value={selectedQuestionIndex}
                  onChange={(e) => setSelectedQuestionIndex(parseInt(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {currentQuestions.map((_, index) => (
                    <option key={index} value={index}>
                      Question {index + 1}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">
                  ({currentQuestions.length} total)
                </span>
              </div>

              {/* Question preview */}
              {currentQuestions[selectedQuestionIndex] && 
                renderQuestionPreview(currentQuestions[selectedQuestionIndex], selectedQuestionIndex)
              }

              {/* Navigation */}
              <div className="flex justify-between">
                <Button 
                  onClick={() => setSelectedQuestionIndex(Math.max(0, selectedQuestionIndex - 1))}
                  disabled={selectedQuestionIndex === 0}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button 
                  onClick={() => setSelectedQuestionIndex(Math.min(currentQuestions.length - 1, selectedQuestionIndex + 1))}
                  disabled={selectedQuestionIndex === currentQuestions.length - 1}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};