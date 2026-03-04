import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function StoryPlayerPage() {
    const { sessionId } = useParams();

    return (
        <div className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Story Player</h1>
                <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    Session: {sessionId}
                </div>
            </div>

            <Card className="flex-1 shadow-md flex flex-col items-center justify-center text-center p-8">
                <CardHeader>
                    <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <CardTitle className="text-3xl font-extrabold text-slate-800">
                        Player Canvas Placeholder
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        This is where the story rendering engine, branching choices, and interactive elements will go.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">Choice A</Button>
                        <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">Choice B</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
