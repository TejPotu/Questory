import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="relative flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] overflow-hidden">
            {/* Scrolling Background Layer */}
            <div
                className="absolute inset-0 w-[200vw] h-full bg-[url('/cartoon_adventure_bg.png')] bg-repeat-x bg-cover bg-left-top animate-scroll-bg opacity-[0.85]"
                style={{ backgroundSize: 'auto 100%' }}
            />

            {/* Subtle Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-slate-900/5 to-slate-900/20 pointer-events-none" />

            {/* Main Content Card */}
            <div className="relative z-10 w-full max-w-3xl px-4 md:px-0">
                <Card className="border border-white/40 shadow-2xl bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden">
                    <CardHeader className="text-center space-y-4 pt-16 pb-8 px-8">
                        <div className="space-y-4">
                            <CardTitle className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight">
                                Questory
                            </CardTitle>
                            <CardDescription className="text-xl md:text-2xl font-medium text-slate-600 mt-4 max-w-2xl mx-auto leading-relaxed">
                                Dive into magical interactive stories where <span className="text-indigo-600 font-bold">you</span> control the adventure!
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-16 pt-6">
                        <Button
                            size="lg"
                            className="text-lg px-8 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 group"
                            onClick={() => navigate('/create')}
                        >
                            <span className="flex items-center gap-2">
                                Start Your Journey
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
