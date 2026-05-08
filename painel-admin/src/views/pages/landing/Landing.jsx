import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'

const Landing = () => {
    const navigate = useNavigate()

    return (
        <div className="landing-premium-wrapper">
            <style>{`
                .landing-premium-wrapper {
                    background: #000;
                    color: #fff;
                    font-family: system-ui, -apple-system, sans-serif;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    overflow-x: hidden;
                }
                .landing-premium-wrapper .hero-container {
                    position: relative;
                    width: 100%;
                    height: 95vh;
                    margin: 10px auto;
                    max-width: 1800px;
                    border-radius: 2rem;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .landing-premium-wrapper .hero-media {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .landing-premium-wrapper .hero-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%);
                    z-index: 1;
                }
                .landing-premium-wrapper .hero-content {
                    position: absolute;
                    inset: 0;
                    z-index: 10;
                    padding: 3rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                }
                .landing-premium-wrapper .nav-glass {
                    position: absolute;
                    top: 2rem;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(15px);
                    padding: 1rem 2.5rem;
                    border-radius: 2rem;
                    display: flex;
                    gap: 2.5rem;
                    border: 1px solid rgba(255,255,255,0.1);
                    z-index: 20;
                }
                .landing-premium-wrapper .nav-link {
                    color: rgba(222, 219, 200, 0.7);
                    text-decoration: none;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 0.15em;
                    transition: all 0.3s;
                }
                .landing-premium-wrapper .nav-link:hover { color: #fff; transform: scale(1.05); }

                .landing-premium-wrapper .title-main {
                    font-size: clamp(3rem, 10vw, 8rem);
                    color: #DEDBC8;
                    line-height: 0.8;
                    letter-spacing: -0.05em;
                    margin-bottom: 2rem;
                }
                .landing-premium-wrapper .hero-footer {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    align-items: flex-end;
                    gap: 4rem;
                }
                .landing-premium-wrapper .desc-text {
                    color: rgba(222, 219, 200, 0.6);
                    font-size: 1.1rem;
                    line-height: 1.4;
                    max-width: 400px;
                    border-left: 2px solid rgba(222, 219, 200, 0.2);
                    padding-left: 1.5rem;
                }
                .landing-premium-wrapper .btn-premium {
                    background: #DEDBC8;
                    color: #000;
                    border: none;
                    padding: 0.5rem 0.5rem 0.5rem 2rem;
                    border-radius: 100px;
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.4s;
                    box-shadow: 0 0 30px rgba(222,219,200,0.2);
                }
                .landing-premium-wrapper .btn-premium:hover {
                    gap: 2.5rem;
                    box-shadow: 0 0 50px rgba(222,219,200,0.4);
                }
                .landing-premium-wrapper .btn-icon {
                    background: #000;
                    width: 3.5rem;
                    height: 3.5rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                @media (max-width: 768px) {
                    .landing-premium-wrapper .nav-glass { gap: 1rem; padding: 0.8rem 1.5rem; width: 90%; justify-content: center; }
                    .landing-premium-wrapper .nav-link { font-size: 0.6rem; }
                    .landing-premium-wrapper .hero-footer { grid-template-columns: 1fr; gap: 2rem; }
                    .landing-premium-wrapper .hero-content { padding: 1.5rem; }
                    .landing-premium-wrapper .title-main { font-size: 4rem; }
                }
            `}</style>

            <div className="hero-container">
                {/* Media Background */}
                <img
                    src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80"
                    className="hero-media"
                    alt="Hero"
                />
                <div className="hero-overlay" />

                {/* Navigation */}
                <nav className="nav-glass">
                    <a href="#" className="nav-link">Metodologia</a>
                    <a href="#" className="nav-link">Módulos</a>
                    <a href="#" className="nav-link">Trilhas</a>
                    <a href="#" className="nav-link">Planos</a>
                    <a href="#" className="nav-link">Suporte</a>
                </nav>

                {/* Content */}
                <div className="hero-content">
                    <motion.h1
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="title-main"
                    >
                        Contabilidade<br/>Fácil<span style={{ fontSize: '0.4em', verticalAlign: 'top' }}>*</span>
                    </motion.h1>

                    <div className="hero-footer">
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="desc-text"
                        >
                            A plataforma definitiva para dominar as Ciências Contábeis na UEA. Conteúdo de elite, simulados reais e suporte direto do professor.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                        >
                            <button className="btn-premium" onClick={() => navigate('/login')}>
                                ACESSAR PLATAFORMA
                                <div className="btn-icon">
                                    <Icon icon="solar:arrow-right-linear" width="24" style={{ color: '#DEDBC8' }} />
                                </div>
                            </button>
                        </motion.div>
                    </div>
                </div>
            </div>
            
            {/* Espaço extra opcional para garantir o scroll se necessário */}
            <div style={{ height: '5vh' }} />
        </div>
    )
}

export default Landing
