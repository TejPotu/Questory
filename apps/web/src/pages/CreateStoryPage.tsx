import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function CreateStoryPage() {
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');

    const handleStart = () => {
        // Generate a fake session ID for now and navigate
        const sessionId = Math.random().toString(36).substring(7);
        navigate(`/play/${sessionId}`);
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
            <Card className="max-w-md w-full shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Story Setup Wizard</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">What do you want to learn about?</label>
                        <Input
                            placeholder="e.g., Space exploration, Dinosaurs, Ancient Rome..."
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="text-lg py-6"
                        />
                    </div>
                    <Button
                        size="lg"
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        disabled={!topic.trim()}
                        onClick={handleStart}
                    >
                        Create & Play
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
