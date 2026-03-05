import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Loader2, FileUp, Link as LinkIcon, Shield, Rocket, Search, User, Play, Send } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';

export function CreateStoryPage() {
    const navigate = useNavigate();

    // Core state
    const [topic, setTopic] = useState('');
    const [character, setCharacter] = useState('Brave Knight');
    const [artStyle, setArtStyle] = useState('Vibrant 3D (Default)');
    const [voice, setVoice] = useState('Friendly Guide (Default)');
    const [ageRange, setAgeRange] = useState([2]);
    const [quizFreq, setQuizFreq] = useState('medium');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // AI hook integration
    const { status, gamePhase, setGamePhase, connect, disconnect, isThinking, sendText } = useGeminiLive({
        onFunctionCall: (name, args) => {
            if (name === 'setTopic' && args.topic) setTopic(args.topic);
            if (name === 'setStyle') {
                if (args.character) setCharacter(args.character);
                if (args.artStyle) setArtStyle(args.artStyle);
            }
            if (name === 'setSettings') {
                if (args.ageRange !== undefined) setAgeRange([args.ageRange]);
                if (args.quizFrequency) setQuizFreq(args.quizFrequency);
            }
        }
    });

    const isConnected = status === 'connected';

    // Auto-connect on mount if we want to kickstart the interaction, or let user click mic.
    const toggleVoice = () => {
        if (isConnected) {
            disconnect();
        } else {
            connect("You are the Questory Game Master. You are helping a child set up their interactive learning adventure. Start by enthusiastically asking what they want to learn about today. Wait for their answer, then call setTopic with their answer. Keep responses under 2 sentences. Next, ask what character and art style they want, then call setStyle with their choices. Finally, ask how difficult the puzzles should be, then call setSettings.");
        }
    };

    const handleTopicSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!topic.trim()) return;
        if (isConnected) {
            sendText(`I want the topic to be: ${topic}. What's next?`);
        } else {
            setGamePhase('style');
        }
    };

    const handleCharacterSelect = (char: string) => {
        setCharacter(char);
        if (isConnected) {
            sendText(`I pick the ${char} character!`);
        }
    };

    const handleStyleSubmit = () => {
        if (isConnected) {
            sendText(`I want a ${artStyle} look with the ${voice} voice. Please proceed.`);
        } else {
            setGamePhase('settings');
        }
    };

    const handleSettingsSubmit = async () => {
        if (isConnected) {
            sendText(`I'm ready to play! Generate my story.`);
        }
        setIsSubmitting(true);
        try {
            const sessionId = Math.random().toString(36).substring(7);
            navigate(`/play/${sessionId}`);
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 w-full h-screen relative overflow-hidden bg-slate-900 flex justify-center items-center">
            {/* Immersive Game Background */}
            <div
                className="absolute inset-0 bg-cover bg-center animate-scroll-bg opacity-40 blur-sm mix-blend-luminosity scale-110"
                style={{ backgroundImage: `url('/cartoon_adventure_bg.png')` }}
            />
            {/* Dynamic ambient glow based on thinking state */}
            <div className={`absolute inset-0 transition-opacity duration-1000 radial-gradient ${isThinking ? 'bg-indigo-900/40 opacity-100' : 'opacity-0'}`} />

            {/* Central Gemini Orb / Voice Button */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
                <Button
                    onClick={toggleVoice}
                    className={`h-24 w-24 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 ease-out border-4 ${isConnected
                        ? isThinking
                            ? 'bg-indigo-500/80 border-indigo-400 scale-110 shadow-[0_0_50px_-12px_rgba(99,102,241,1)]'
                            : 'bg-indigo-600 border-indigo-500 scale-100'
                        : 'bg-slate-800/80 border-slate-600 hover:bg-slate-700 hover:scale-105'
                        }`}
                >
                    {isConnected ? (
                        isThinking ? <Loader2 className="w-10 h-10 text-white animate-spin" /> : <Mic className="w-10 h-10 text-white animate-pulse" />
                    ) : (
                        <MicOff className="w-10 h-10 text-slate-400" />
                    )}
                </Button>
                <div className="mt-4 text-center">
                    <p className="text-white font-bold text-lg tracking-wide drop-shadow-md">
                        {isConnected ? (isThinking ? "Gemini is thinking..." : "Gemini is listening...") : "Tap to activate Game Master"}
                    </p>
                </div>
            </div>

            {/* Interactive Stage Area */}
            <div className="w-full max-w-4xl px-6 relative z-10 mt-20">
                {gamePhase === 'topic' && (
                    <div className="animate-in zoom-in-95 fade-in duration-500 flex flex-col items-center space-y-10">
                        <div className="text-center space-y-2">
                            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-xl tracking-tight">Choose Your Quest</h1>
                            <p className="text-xl text-slate-200 font-medium">What world shall we build today?</p>
                        </div>

                        <form onSubmit={handleTopicSubmit} className="w-full max-w-2xl relative shadow-2xl group">
                            <Input
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. Exploring the deep ocean..."
                                className="w-full h-20 text-2xl px-8 rounded-full bg-white/10 backdrop-blur-xl border-2 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-4 focus-visible:ring-indigo-500 focus-visible:border-white transition-all shadow-[0_8px_32px_rgba(0,0,0,0.3)] group-hover:bg-white/15"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="absolute right-3 top-3 h-14 w-14 rounded-full bg-white text-indigo-900 hover:bg-indigo-50 hover:scale-105 transition-all shadow-lg"
                                disabled={!topic.trim()}
                            >
                                <Send className="w-6 h-6 ml-1" />
                            </Button>
                        </form>

                        <div className="flex gap-4 w-full max-w-lg justify-center mt-6">
                            <Button variant="outline" className="flex-1 h-14 bg-indigo-900/40 backdrop-blur-md border border-indigo-500/30 text-indigo-100 hover:bg-indigo-800/60 hover:text-white rounded-2xl text-lg font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300 transform hover:-translate-y-1">
                                <FileUp className="w-5 h-5 mr-3" /> Upload Book
                            </Button>
                            <Button variant="outline" className="flex-1 h-14 bg-rose-900/40 backdrop-blur-md border border-rose-500/30 text-rose-100 hover:bg-rose-800/60 hover:text-white rounded-2xl text-lg font-bold shadow-[0_0_15px_rgba(244,63,94,0.2)] hover:shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-all duration-300 transform hover:-translate-y-1">
                                <LinkIcon className="w-5 h-5 mr-3" /> Paste Video
                            </Button>
                        </div>

                        {!isConnected && (
                            <div className="pt-8">
                                <Button onClick={() => setGamePhase('style')} variant="ghost" className="text-white/40 hover:text-white/80 hover:bg-white/5 rounded-full px-6 font-medium tracking-wider text-sm uppercase">Skip to next (debug) →</Button>
                            </div>
                        )}
                    </div>
                )}

                {gamePhase === 'style' && (
                    <div className="animate-in slide-in-from-bottom-12 fade-in duration-500 w-full flex flex-col items-center space-y-12">
                        <div className="text-center space-y-2">
                            <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-xl tracking-tight">Pick Your Hero</h1>
                        </div>

                        {/* Immersive Character Selection Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                            {[
                                { name: 'Brave Knight', icon: Shield, color: 'from-blue-500 to-indigo-600' },
                                { name: 'Curious Astronaut', icon: Rocket, color: 'from-orange-500 to-red-600' },
                                { name: 'Clever Detective', icon: Search, color: 'from-emerald-500 to-teal-600' },
                                { name: 'Custom Hero', icon: User, color: 'from-purple-500 to-fuchsia-600' }
                            ].map((char) => {
                                const Icon = char.icon;
                                const isSelected = character === char.name;
                                return (
                                    <div
                                        key={char.name}
                                        onClick={() => handleCharacterSelect(char.name)}
                                        className={`relative group cursor-pointer transition-all duration-300 transform ${isSelected ? 'scale-110 z-10' : 'hover:scale-105 hover:-translate-y-2'}`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${char.color} rounded-3xl blur-xl opacity-0 transition-opacity duration-300 ${isSelected ? 'opacity-60' : 'group-hover:opacity-40'}`} />
                                        <Card className={`relative h-56 rounded-3xl overflow-hidden border-2 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${isSelected
                                            ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]'
                                            : 'bg-slate-900/60 backdrop-blur-xl border-white/10 hover:border-white/30'
                                            }`}>
                                            <div className={`p-4 rounded-full ${isSelected ? 'bg-indigo-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                                <Icon className={`w-12 h-12 ${isSelected ? 'text-indigo-400' : 'text-slate-300'}`} />
                                            </div>
                                            <span className={`font-bold text-center px-4 ${isSelected ? 'text-white text-lg' : 'text-slate-300'}`}>{char.name}</span>
                                        </Card>

                                        {isSelected && (
                                            <div className="absolute -top-3 -right-3 bg-indigo-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-slate-900 shadow-lg animate-bounce">
                                                ✓
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6 shadow-2xl">
                            <div className="space-y-2">
                                <label className="text-white/70 font-bold uppercase text-xs tracking-wider pl-1">Visual Sandbox</label>
                                <select
                                    value={artStyle}
                                    onChange={(e) => setArtStyle(e.target.value)}
                                    className="w-full h-12 bg-white/10 border-white/20 text-white rounded-xl px-4 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold cursor-pointer appearance-none"
                                >
                                    <option className="bg-slate-800 text-white">Vibrant 3D (Default)</option>
                                    <option className="bg-slate-800 text-white">Anime / Manga</option>
                                    <option className="bg-slate-800 text-white">Watercolor Book</option>
                                    <option className="bg-slate-800 text-white">Realistic</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-white/70 font-bold uppercase text-xs tracking-wider pl-1">Storyteller Voice</label>
                                <select
                                    value={voice}
                                    onChange={(e) => setVoice(e.target.value)}
                                    className="w-full h-12 bg-white/10 border-white/20 text-white rounded-xl px-4 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold cursor-pointer appearance-none"
                                >
                                    <option className="bg-slate-800 text-white">Friendly Guide (Default)</option>
                                    <option className="bg-slate-800 text-white">Wise Owl</option>
                                    <option className="bg-slate-800 text-white">Excited Explorer</option>
                                </select>
                            </div>
                        </div>

                        <Button onClick={handleStyleSubmit} className="h-14 px-12 bg-white text-slate-900 hover:bg-indigo-50 rounded-full font-bold text-lg shadow-[0_0_40px_-5px_rgba(255,255,255,0.3)] hover:scale-105 transition-all">
                            Confirm Style
                        </Button>
                    </div>
                )}

                {gamePhase === 'settings' && (
                    <div className="animate-in slide-in-from-right-12 fade-in duration-500 w-full flex flex-col items-center space-y-10">
                        <div className="text-center space-y-2">
                            <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-xl tracking-tight">Tune the Challenge</h1>
                        </div>

                        <div className="w-full max-w-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] space-y-12 shadow-2xl">

                            {/* Tactile Slider */}
                            <div className="space-y-8">
                                <div className="flex justify-between items-end">
                                    <h3 className="text-2xl font-bold text-white">Player Age Level</h3>
                                    <span className="text-lg font-black text-indigo-400 bg-indigo-900/50 px-4 py-1.5 rounded-full border border-indigo-500/30">
                                        {ageRange[0] === 0 ? 'Pre-K' : ageRange[0] === 1 ? '5 - 7 years' : ageRange[0] === 2 ? '8 - 10 years' : ageRange[0] === 3 ? '11 - 13 years' : '14+ years'}
                                    </span>
                                </div>

                                <Slider
                                    value={ageRange}
                                    onValueChange={setAgeRange}
                                    max={4} step={1}
                                    className="cursor-grab active:cursor-grabbing w-full scale-y-150"
                                />

                                <div className="flex justify-between text-sm font-bold text-white/40 px-2 mt-4">
                                    <span className={ageRange[0] === 0 ? 'text-white drop-shadow-md' : ''}>Pre-K</span>
                                    <span className={ageRange[0] === 1 ? 'text-white drop-shadow-md' : ''}>5-7</span>
                                    <span className={ageRange[0] === 2 ? 'text-white drop-shadow-md' : ''}>8-10</span>
                                    <span className={ageRange[0] === 3 ? 'text-white drop-shadow-md' : ''}>11-13</span>
                                    <span className={ageRange[0] === 4 ? 'text-white drop-shadow-md' : ''}>14+</span>
                                </div>
                            </div>

                            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                            {/* Tactile Toggles */}
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-white">Puzzle Frequency</h3>
                                <div className="grid grid-cols-3 gap-4 bg-white/5 p-2 rounded-3xl">
                                    {['Low', 'Medium', 'High'].map((level) => {
                                        const isSelected = quizFreq === level.toLowerCase();
                                        return (
                                            <button
                                                key={level}
                                                onClick={() => {
                                                    setQuizFreq(level.toLowerCase());
                                                    if (isConnected) sendText(`Set puzzle frequency to ${level}.`);
                                                }}
                                                className={`h-16 rounded-2xl font-bold text-lg transition-all duration-300 ${isSelected
                                                    ? 'bg-indigo-500 text-white shadow-lg scale-100 border border-indigo-400'
                                                    : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80'
                                                    }`}
                                            >
                                                {level}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleSettingsSubmit}
                            disabled={isSubmitting}
                            className="h-16 px-16 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white rounded-full font-black text-xl shadow-[0_0_50px_-10px_rgba(236,72,153,0.5)] hover:scale-110 transition-all duration-300 border-2 border-white/20"
                        >
                            {isSubmitting ? <Loader2 className="w-8 h-8 animate-spin" /> : <><Play className="w-6 h-6 mr-3 fill-current" /> START QUEST</>}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
