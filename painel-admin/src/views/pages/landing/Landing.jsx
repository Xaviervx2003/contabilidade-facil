import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

// --- ANIMATION COMPONENTS ---

const WordsPullUp = ({ text, className, showAsterisk }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-10%" });
    const words = text.split(" ");

    return (
        <div ref={ref} className={`flex flex-wrap ${className}`}>
            {words.map((word, i) => {
                const isLastWord = showAsterisk && i === words.length - 1;
                return (
                    <div key={i} className="overflow-hidden mr-[0.2em] relative flex items-start">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={isInView ? { y: 0 } : { y: "100%" }}
                            transition={{ delay: i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="inline-block relative"
                        >
                            {word}
                            {isLastWord && (
                                <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em] font-light">*</span>
                            )}
                        </motion.div>
                    </div>
                );
            })}
        </div>
    );
};

const WordsPullUpMultiStyle = ({ segments, className, wrapperClass = "justify-center" }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-10%" });
    let wordCount = 0;

    return (
        <div ref={ref} className={`inline-flex flex-wrap ${wrapperClass} ${className}`}>
            {segments.map((seg, sIdx) => {
                const words = seg.text.split(" ").filter(w => w !== "");
                return words.map((word, wIdx) => {
                    const currentIdx = wordCount++;
                    return (
                        <div key={`${sIdx}-${wIdx}`} className="overflow-hidden mr-[0.25em] mb-[0.1em]">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={isInView ? { y: 0 } : { y: "100%" }}
                                transition={{ delay: currentIdx * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className={`inline-block ${seg.className || ""}`}
                            >
                                {word}
                            </motion.div>
                        </div>
                    );
                });
            })}
        </div>
    );
};

const ScrollRevealText = ({ text, className }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start 0.8', 'end 0.2']
    });

    const chars = text.split("");

    return (
        <p ref={ref} className={`flex flex-wrap ${className}`}>
            {chars.map((char, i) => {
                const start = i / chars.length - 0.1;
                const end = i / chars.length + 0.05;
                const opacity = useTransform(scrollYProgress, [Math.max(0, start), Math.min(1, end)], [0.2, 1]);
                return (
                    <motion.span key={i} style={{ opacity }} className="whitespace-pre">
                        {char}
                    </motion.span>
                );
            })}
        </p>
    );
};

const FeatureCard = ({ delay, children, className }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    return (
        <motion.div 
            ref={ref} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }} 
            transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }} 
            className={`rounded-3xl overflow-hidden relative flex flex-col ${className}`}
        >
            {children}
        </motion.div>
    )
};

// --- MAIN LANDING PAGE COMPONENT ---

const Landing = () => {
    const navigate = useNavigate();

    return (
        <main className="w-full bg-black min-h-screen font-sans selection:bg-primary selection:text-black">
            {/* HERO SECTION */}
            <section className="h-screen p-4 md:p-6 w-full bg-black flex flex-col">
                <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden flex-1 bg-[#101010]">
                    <video 
                        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4" 
                        autoPlay loop muted playsInline 
                        className="absolute inset-0 w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 noise-overlay opacity-[0.7] mix-blend-overlay pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

                    <nav className="absolute top-0 left-1/2 -translate-x-1/2 bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-8 z-10 flex items-center justify-center gap-3 sm:gap-6 md:gap-12 lg:gap-14 shadow-2xl">
                        {['Metodologia', 'Módulos', 'Trilhas', 'Planos', 'Suporte'].map(link => (
                            <a 
                                href="#" 
                                key={link} 
                                className="text-[10px] sm:text-xs md:text-sm font-light tracking-wide transition-colors duration-300 no-underline" 
                                style={{ color: 'rgba(225,224,204,0.8)' }} 
                            >
                                {link}
                            </a>
                        ))}
                    </nav>

                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 lg:p-12 z-10">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-end">
                            <div className="md:col-span-8">
                                <WordsPullUp 
                                    text="Contabilidade Fácil" 
                                    showAsterisk 
                                    className="text-[12vw] sm:text-[10vw] md:text-[9vw] lg:text-[8vw] xl:text-[7vw] 2xl:text-[6vw] font-normal leading-[0.85] tracking-[-0.07em] text-primary" 
                                />
                            </div>
                            <div className="md:col-span-4 flex flex-col items-start gap-5 md:gap-6 md:pb-4 lg:pb-6">
                                <motion.p 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className="text-primary/70 text-xs sm:text-sm md:text-base font-light tracking-wide max-w-sm"
                                    style={{ lineHeight: 1.2 }}
                                >
                                    A plataforma definitiva para dominar as Ciências Contábeis na UEA. Conteúdo de elite, simulados reais e suporte direto.
                                </motion.p>
                                
                                <motion.button 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    onClick={() => navigate('/login')}
                                    className="group border-0 flex items-center gap-2 hover:gap-3 bg-primary rounded-full py-1 pl-5 pr-1 transition-all duration-300 text-black font-normal text-sm sm:text-base cursor-pointer"
                                >
                                    Começar agora
                                    <div className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Icon icon="solar:arrow-right-linear" className="text-primary text-lg sm:text-xl" />
                                    </div>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ABOUT SECTION */}
            <section className="bg-black py-20 md:py-32 px-4 md:px-8 flex justify-center w-full">
                <div className="bg-[#101010] rounded-[2rem] p-8 sm:p-12 md:p-16 lg:p-24 w-full max-w-6xl flex flex-col items-center text-center gap-8 md:gap-12 shadow-2xl relative overflow-hidden">
                    <span className="text-primary text-[10px] sm:text-xs tracking-widest uppercase font-light opacity-80">
                        Ensino Superior Premium
                    </span>
                    
                    <WordsPullUpMultiStyle
                        segments={[
                            { text: "O caminho mais rápido para a aprovação, ", className: "font-light text-primary" },
                            { text: "com foco total na prática. ", className: "font-serif italic text-primary pr-2" },
                            { text: "Desenvolvemos habilidades em análise contábil, auditoria e perícia para o mercado real.", className: "font-light text-primary" }
                        ]}
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-4xl leading-[0.95] sm:leading-[0.9] tracking-tight"
                    />
                    
                    <div className="max-w-2xl mt-4 md:mt-8">
                        <ScrollRevealText 
                            text="Ao longo dos últimos anos, ajudamos centenas de alunos a superarem as matérias mais complexas do curso. Nossa plataforma une a teoria necessária com a prática que o mercado exige, tudo em um ambiente focado no seu progresso." 
                            className="text-[#DEDBC8] text-xs sm:text-sm md:text-base justify-center font-light leading-relaxed tracking-wide" 
                        />
                    </div>
                </div>
            </section>

            {/* FEATURES SECTION */}
            <section className="min-h-screen bg-black relative py-20 md:py-32 px-4 md:px-6 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-noise opacity-[0.15] pointer-events-none z-[-1]" />
                <div className="max-w-[1400px] mx-auto flex flex-col gap-10 md:gap-16">
                    <div className="w-full max-w-3xl">
                        <WordsPullUpMultiStyle
                            wrapperClass="justify-start text-left"
                            segments={[
                                { text: "Experiência de estudo imersiva para futuros contadores. ", className: "text-primary block w-full" },
                                { text: "Construído para resultados. Movido por excelência.", className: "text-gray-500 block w-full" }
                            ]}
                            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light tracking-tight"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-2 md:gap-1 lg:h-[480px]">
                        <FeatureCard delay={0.15} className="md:col-span-2 lg:col-span-1 h-[350px] sm:h-[400px] lg:h-full bg-[#151515]">
                            <video 
                                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4" 
                                autoPlay loop muted playsInline 
                                className="absolute inset-0 w-full h-full object-cover opacity-60" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            <div className="mt-auto p-6 z-10 w-full">
                                <p className="text-[#E1E0CC] font-light tracking-wide text-sm sm:text-base">Foco total no aprendizado.</p>
                            </div>
                        </FeatureCard>

                        <FeatureCard delay={0.30} className="bg-[#181818] p-6 sm:p-8 h-auto lg:h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-xl mb-6 flex items-center justify-center bg-primary/10">
                                    <Icon icon="solar:notebook-linear" className="text-primary text-3xl" />
                                </div>
                                <div className="flex justify-between items-baseline mb-8">
                                    <h3 className="text-primary text-base sm:text-lg font-normal tracking-tight">Trilhas de Estudo.</h3>
                                    <span className="text-gray-500 text-xs font-light tracking-widest">01</span>
                                </div>
                                <ul className="flex flex-col gap-4 p-0">
                                    <li className="flex items-start gap-3 text-gray-400 text-xs sm:text-sm font-light list-none">
                                        <Icon icon="solar:check-circle-linear" className="text-primary mt-[2px] text-base flex-shrink-0 opacity-80" />
                                        <span className="leading-snug">Mapeamento sequencial de conteúdo</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-400 text-xs sm:text-sm font-light list-none">
                                        <Icon icon="solar:check-circle-linear" className="text-primary mt-[2px] text-base flex-shrink-0 opacity-80" />
                                        <span className="leading-snug">Progresso visual detalhado</span>
                                    </li>
                                </ul>
                            </div>
                            <button onClick={() => navigate('/login')} className="flex border-0 bg-transparent cursor-pointer items-center gap-2 text-primary text-xs sm:text-sm font-normal mt-10 group w-fit hover:text-white transition-colors">
                                Explorar <Icon icon="solar:arrow-right-linear" className="text-base -rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                            </button>
                        </FeatureCard>

                        <FeatureCard delay={0.45} className="bg-[#181818] p-6 sm:p-8 h-auto lg:h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-xl mb-6 flex items-center justify-center bg-primary/10">
                                    <Icon icon="solar:ranking-linear" className="text-primary text-3xl" />
                                </div>
                                <div className="flex justify-between items-baseline mb-8">
                                    <h3 className="text-primary text-base sm:text-lg font-normal tracking-tight">Simulados Reais.</h3>
                                    <span className="text-gray-500 text-xs font-light tracking-widest">02</span>
                                </div>
                                <ul className="flex flex-col gap-4 p-0">
                                    <li className="flex items-start gap-3 text-gray-400 text-xs sm:text-sm font-light list-none">
                                        <Icon icon="solar:check-circle-linear" className="text-primary mt-[2px] text-base flex-shrink-0 opacity-80" />
                                        <span className="leading-snug">Base de questões da UEA e Concursos</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-400 text-xs sm:text-sm font-light list-none">
                                        <Icon icon="solar:check-circle-linear" className="text-primary mt-[2px] text-base flex-shrink-0 opacity-80" />
                                        <span className="leading-snug">Rankings e Desempenho Global</span>
                                    </li>
                                </ul>
                            </div>
                            <button onClick={() => navigate('/login')} className="flex border-0 bg-transparent cursor-pointer items-center gap-2 text-primary text-xs sm:text-sm font-normal mt-10 group w-fit hover:text-white transition-colors">
                                Treinar <Icon icon="solar:arrow-right-linear" className="text-base -rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                            </button>
                        </FeatureCard>

                        <FeatureCard delay={0.60} className="bg-[#181818] p-6 sm:p-8 h-auto lg:h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-xl mb-6 flex items-center justify-center bg-primary/10">
                                    <Icon icon="solar:medal-star-linear" className="text-primary text-3xl" />
                                </div>
                                <div className="flex justify-between items-baseline mb-8">
                                    <h3 className="text-primary text-base sm:text-lg font-normal tracking-tight">Gamificação Premium.</h3>
                                    <span className="text-gray-500 text-xs font-light tracking-widest">03</span>
                                </div>
                                <ul className="flex flex-col gap-4 p-0">
                                    <li className="flex items-start gap-3 text-gray-400 text-xs sm:text-sm font-light list-none">
                                        <Icon icon="solar:check-circle-linear" className="text-primary mt-[2px] text-base flex-shrink-0 opacity-80" />
                                        <span className="leading-snug">Conquistas e Insígnias de Elite</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-400 text-xs sm:text-sm font-light list-none">
                                        <Icon icon="solar:check-circle-linear" className="text-primary mt-[2px] text-base flex-shrink-0 opacity-80" />
                                        <span className="leading-snug">Sistema de Streaks e Níveis</span>
                                    </li>
                                </ul>
                            </div>
                            <button onClick={() => navigate('/login')} className="flex border-0 bg-transparent cursor-pointer items-center gap-2 text-primary text-xs sm:text-sm font-normal mt-10 group w-fit hover:text-white transition-colors">
                                Ver mais <Icon icon="solar:arrow-right-linear" className="text-base -rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                            </button>
                        </FeatureCard>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Landing;
