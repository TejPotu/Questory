import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HelpCircle, Lightbulb, Map, CircleDot, Mic, Loader2 } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';

// Mock Session Data reflecting Deep Interactive UI
const MOCK_SCENE = {
    id: 'scene_1',
    progressPercent: 25,
    whispers: [
        "Let's follow the footprints!",
        "I want to climb the tree!"
    ],
    hotspots: [
        {
            id: 'h1',
            x: 35,
            y: 60,
            title: 'Theropod Footprint',
            fact: 'Theropods were bipedal dinosaurs, meaning they walked on two legs. T-Rex is the most famous!'
        },
        {
            id: 'h2',
            x: 75,
            y: 30,
            title: 'Mesozoic Ferns',
            fact: 'These giant prehistoric ferns reproduce using tiny spores instead of seeds.'
        }
    ]
};

export function StoryPlayerPage() {
    const { sessionId: _sessionId } = useParams();
    const [activeFact, setActiveFact] = useState<string | null>(null);
    const [narration, setNarration] = useState("A sudden rustling in the giant ferns breaks the silence. A massive footprint, fresh in the mud, warns of a giant nearby.");
    const [bgImage, setBgImage] = useState('/dreamy_forest_scene.png');

    const { status, connect, disconnect, isThinking, sendText } = useGeminiLive({
        onMessage: (text) => {
            // Very simple accumulation for subtitles. Real app might clear it on new turns.
            setNarration(text);
        },
        onSceneUpdate: (imageUrl) => {
            setBgImage(imageUrl);
        }
    });

    const isConnected = status === 'connected';

    const toggleVoice = () => {
        if (isConnected) {
            disconnect();
        } else {
            connect("You are the narrator and guide for an interactive learning story. The user is in a dreamy prehistoric forest scene. Talk to them enthusiastically. Start by describing the giant footprints and rustling ferns in 1 or 2 short sentences and ask what they want to do next. If they inspect an object, give them a fun 2-sentence educational fact. IMPORTANT: If they decide to move to a new area, use the generate_scene_image tool.");
            setNarration("Gemini is connecting...");
        }
    };

    // Mock speaking interaction
    const handleHotspotClick = (fact: string) => {
        setActiveFact(fact);
        if (isConnected) {
            sendText(`I'm looking at this! Please tell me a 2-sentence fact about: ${fact}`);
        }
        // Auto-dismiss fact after reading
        setTimeout(() => setActiveFact(null), 8000);
    };

    return (
        <div className="w-full h-screen overflow-hidden relative bg-black flex flex-col font-sans select-none">
            {/* Absolute Background Image Layer */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[40s] ease-linear hover:scale-110 will-change-transform"
                style={{ backgroundImage: `url('${bgImage}')` }}
            />
            {/* Minimal Vignettes for readability - No chunky backgrounds */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

            {/* Top HUD: Sleek Minimal Map */}
            <div className="absolute top-0 left-0 right-0 p-6 z-40 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2.5 shadow-lg">
                        <Map className="w-4 h-4 text-cyan-400" />
                        <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between text-[9px] font-black uppercase text-cyan-100/70 tracking-widest">
                                <span>Scene 1</span>
                                <span>Of 4</span>
                            </div>
                            <Progress value={MOCK_SCENE.progressPercent} className="h-1.5 bg-slate-800/80 [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-cyan-400" />
                        </div>
                    </div>
                </div>

                {/* Diegetic Tools */}
                <div className="pointer-events-auto flex gap-3">
                    <Button variant="ghost" size="icon" className="rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white/70 hover:text-amber-400 hover:bg-amber-400/20 hover:border-amber-400/50 shadow-lg transition-all">
                        <Lightbulb className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white/70 hover:text-sky-400 hover:bg-sky-400/20 hover:border-sky-400/50 shadow-lg transition-all">
                        <HelpCircle className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Interactive World Layer (Glowing Orbs) */}
            <div className="absolute inset-0 z-20">
                {MOCK_SCENE.hotspots.map((hotspot) => (
                    <button
                        key={hotspot.id}
                        onClick={() => handleHotspotClick(hotspot.fact)}
                        className="absolute w-16 h-16 -ml-8 -mt-8 rounded-full border border-white/30 flex items-center justify-center group outline-none"
                        style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                        aria-label={`Inspect ${hotspot.title}`}
                    >
                        {/* Glowing rings */}
                        <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping pointer-events-none" />
                        <div className="absolute inset-2 bg-emerald-400/40 rounded-full animate-pulse blur-sm pointer-events-none" />
                        <div className="relative z-10 w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm shadow-[0_0_20px_rgba(52,211,153,0.8)] flex items-center justify-center transition-transform duration-300 group-hover:scale-150">
                            <CircleDot className="w-4 h-4 text-emerald-700" />
                        </div>

                        {/* Hover Tooltip - extremely minimal */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap hidden md:block">
                            <span className="text-white text-xs font-bold font-mono tracking-widest uppercase">{hotspot.title}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Floating Deep Fact Panel (Replaces Sheet) */}
            <div className={`absolute top-24 right-6 left-6 md:left-auto md:w-96 z-50 bg-slate-900/80 backdrop-blur-2xl border-l-4 border-l-emerald-400 border-t border-r border-b border-white/10 p-5 rounded-2xl shadow-2xl transition-all duration-500 ease-out transform ${activeFact ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0 pointer-events-none'}`}>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Gemini Noticed</h4>
                <p className="text-white/90 text-sm leading-relaxed font-medium">
                    "{activeFact}"
                </p>
            </div>

            {/* Bottom HUD: Cinematic Subtitles & Voice Orb */}
            <div className="absolute bottom-0 left-0 w-full z-30 flex flex-col items-center justify-end pb-12 px-6 pointer-events-none h-1/2">

                {/* Floating "Whisper" Actions */}
                <div className="absolute left-6 bottom-12 flex flex-col gap-3 items-start z-40 pointer-events-auto">
                    {MOCK_SCENE.whispers.map((whisper, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                if (isConnected) sendText(whisper);
                            }}
                            className="group flex items-center gap-3 text-white/50 hover:text-white transition-all duration-300 hover:translate-x-2"
                        >
                            <span className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity">*</span>
                            <span className="text-sm md:text-base font-medium italic drop-shadow-md">"{whisper}"</span>
                        </button>
                    ))}
                </div>

                <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
                    {/* The Narration - Cinematic Subtitle Style */}
                    <div className="text-center mb-10 md:mb-16">
                        <p className="text-white text-xl md:text-3xl lg:text-4xl font-medium leading-tight md:leading-snug drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] max-w-3xl mx-auto transition-all duration-500">
                            "{narration}"
                        </p>
                    </div>

                    {/* Central Gemini Voice Orb - Pointer Events Auto */}
                    <div className="pointer-events-auto relative mt-4">
                        <button
                            onClick={toggleVoice}
                            className="relative group outline-none"
                            aria-label="Speak to Gemini"
                        >
                            {/* Listening Aura */}
                            <div className={`absolute -inset-8 rounded-full blur-xl transition-all duration-700 pointer-events-none ${isConnected ? (isThinking ? 'bg-indigo-500/40 animate-pulse' : 'bg-cyan-500/40 animate-pulse') : 'bg-transparent'}`} />
                            <div className={`absolute -inset-4 rounded-full blur-md transition-all duration-500 pointer-events-none ${isConnected ? 'bg-cyan-500/50' : 'bg-transparent'}`} />

                            {/* Orb Core */}
                            <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${isConnected ? (isThinking ? 'bg-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.8)] scale-110' : 'bg-white shadow-[0_0_40px_rgba(255,255,255,0.8)] scale-110') : 'bg-white/10 backdrop-blur-xl border border-white/30 hover:bg-white/20 hover:scale-105'}`}>
                                {isConnected ? (
                                    isThinking ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Mic className="w-8 h-8 text-indigo-600 animate-bounce" />
                                ) : (
                                    <Mic className="w-8 h-8 text-white/80" />
                                )}
                            </div>

                            {/* Status Text */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 whitespace-nowrap">
                                <span className={`text-xs font-black uppercase tracking-[0.3em] ${isConnected ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]' : 'text-white/40'}`}>
                                    {isConnected ? (isThinking ? 'Thinking...' : 'Listening...') : 'Tap to Connect'}
                                </span>
                            </div>
                        </button>
                    </div>

                </div>
            </div>

        </div>
    );
}
