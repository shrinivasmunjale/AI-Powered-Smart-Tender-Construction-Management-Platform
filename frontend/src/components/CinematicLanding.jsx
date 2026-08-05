import React, { useEffect, useRef, useState } from 'react';

export default function CinematicLanding({ onEnterPortal }) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const controlsRef = useRef(null);

  // States for animation math
  const stateRef = useRef({
    targetMouseX: 0,
    targetMouseY: 0,
    mouseX: 0,
    mouseY: 0,
    targetScroll: 0,
    smoothScroll: 0,
    initialized: false,
    rafPending: false,
    activeSight: 5, // Start in middle set (5 is first card of middle set)
    originalSightCount: 5
  });

  const [activeCardIndex, setActiveCardIndex] = useState(5);

  const mockTenders = [
    {
      id: 1,
      kicker: 'Infrastructure',
      title: 'Stari Most Arch Restoration',
      description: "The stone arch over the Neretva and Mostar's main landmark.",
      pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png',
      ariaLabel: 'Open Stari Most card'
    },
    {
      id: 2,
      kicker: 'Bazaar Street',
      title: 'Kujundziluk lane paving',
      description: 'Copper shops, souvenirs, and the old bazaar lane by the bridge.',
      pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png',
      ariaLabel: 'Open Kujundziluk card'
    },
    {
      id: 3,
      kicker: 'Viewpoint',
      title: 'Koski Mosque viewpoint',
      description: 'A classic minaret view back toward Stari Most and the river.',
      pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230448_825949c9-ccdb-4857-b4a6-e349eccc9010.png',
      ariaLabel: 'Open Koski Mehmed Pasha Mosque card'
    },
    {
      id: 4,
      kicker: 'Ottoman House',
      title: 'Kajtaz House fortification',
      description: "A preserved residential house showing Mostar's Ottoman layers.",
      pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png',
      ariaLabel: 'Open Kajtaz House card'
    },
    {
      id: 5,
      kicker: 'Museum',
      title: 'War Photo Exhibition',
      description: "A compact, moving stop for context on the city's recent history.",
      pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png',
      ariaLabel: 'Open War Photo Exhibition card'
    }
  ];

  // Render 3 sets of cards for infinite scroll (15 cards total)
  const allCards = [];
  for (let set = 0; set < 3; set++) {
    mockTenders.forEach((tender, idx) => {
      allCards.push({
        ...tender,
        uniqueKey: `${set}-${idx}`,
        globalIndex: set * 5 + idx
      });
    });
  }

  useEffect(() => {
    // Basic helpers
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const smoothstep = (e0, e1, v) => {
      const x = clamp((v - e0) / (e1 - e0));
      return x * x * (3 - 2 * x);
    };
    const lerp = (a, b, t) => a + (b - a) * t;
    const segmentInOut = (s, a, b, c, d) => {
      const enter = smoothstep(a, b, s);
      const exit = smoothstep(c, d, s);
      return { enter, exit, active: enter * (1 - exit) };
    };

    // Cache viewport dimensions to avoid layout thrashing
    stateRef.current.innerWidth = window.innerWidth;
    stateRef.current.innerHeight = window.innerHeight;

    const getScrollDistance = () => {
      // Since container starts at the top, scroll distance is window.scrollY.
      // Cap at the scrollable height (3700px)
      return Math.min(3700, Math.max(0, window.scrollY));
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      const state = stateRef.current;
      state.targetScroll = getScrollDistance();

      if (!state.initialized || reduceMotion.matches) {
        state.smoothScroll = state.targetScroll;
        state.initialized = true;
      } else {
        state.smoothScroll = lerp(state.smoothScroll, state.targetScroll, 0.14);
      }

      if (Math.abs(state.smoothScroll - state.targetScroll) < 0.08) {
        state.smoothScroll = state.targetScroll;
      }

      state.mouseX = lerp(state.mouseX, state.targetMouseX, 0.12);
      state.mouseY = lerp(state.mouseY, state.targetMouseY, 0.12);

      const smoothScroll = state.smoothScroll;
      const mouseX = state.mouseX;
      const mouseY = state.mouseY;

      // Segment calculations verbatim from design.md
      const frame2 = segmentInOut(smoothScroll, 560, 900, 1300, 1620);
      const frame3 = segmentInOut(smoothScroll, 1760, 2140, 2540, 2700);
      const progress = clamp(smoothScroll / 2700);
      const introExit = smoothstep(90, 650, smoothScroll);
      const sightsEnterRaw = smoothstep(2760, 3560, smoothScroll);
      const sightsEnter = Math.pow(sightsEnterRaw, 1.55);
      const sightsControlsEnter = smoothstep(3360, 3660, smoothScroll);
      const blurActive = clamp(frame2.active + frame3.active);
      const frame2Opacity = frame2.active * (1 - frame3.enter);
      const splitDrift = Math.pow(frame2.enter, 1.5);
      const panel2Opacity = frame2.active * (1 - frame2.exit);
      const panel3Opacity = frame3.active * (1 - frame3.exit);
      const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
      const sharedHeroY = progress * -74;
      const sharedHeroScale = progress * 0.23;
      
      const sightsScreenTop = Math.min(220, Math.max(112, state.innerHeight * 0.19)) - 50;
      const sightsParentTop = state.innerHeight - (state.innerHeight - sightsScreenTop) / backScale;

      // Set CSS Custom Properties on stage Ref
      if (stageRef.current) {
        const style = stageRef.current.style;
        const isReduced = reduceMotion.matches;

        style.setProperty('--mx', isReduced ? '0' : mouseX.toFixed(4));
        style.setProperty('--my', isReduced ? '0' : mouseY.toFixed(4));
        
        style.setProperty('--back-opacity', (1 - frame2.active * 0.06).toFixed(4));
        style.setProperty('--back-x', `${isReduced ? 0 : (mouseX * -12).toFixed(2)}px`);
        style.setProperty('--back-y', `${isReduced ? 0 : (mouseY * -4).toFixed(2)}px`);
        style.setProperty('--back-scale', backScale.toFixed(4));
        
        style.setProperty('--four-y', `${(10 + progress * 10).toFixed(2)}vh`);
        style.setProperty('--four-scale', (0.78 + progress * 0.16).toFixed(4));
        
        style.setProperty('--bazaar-y', `${(20 - progress * 8).toFixed(2)}vh`);
        style.setProperty('--blur-px', `${(blurActive * 14).toFixed(2)}px`);
        style.setProperty('--back-brightness', (1 - blurActive * 0.255).toFixed(4));
        
        style.setProperty('--bazaar-blur-px', `${(frame2.active * 14).toFixed(2)}px`);
        style.setProperty('--bazaar-brightness', (1 - frame2.active * 0.255 - frame3.active * 0.06).toFixed(4));
        style.setProperty('--bazaar-saturation', (1 + frame3.active * 0.18).toFixed(4));
        
        style.setProperty('--shade-opacity', '1');
        style.setProperty('--shade-z', frame2.active > 0.02 ? '2' : '0');
        style.setProperty('--shade-top-alpha', (blurActive * 0.465).toFixed(4));
        style.setProperty('--shade-mid-alpha', (blurActive * 0.42).toFixed(4));
        style.setProperty('--shade-bottom-alpha', (blurActive * 0.51).toFixed(4));

        style.setProperty('--title-y', `${(introExit * -210).toFixed(2)}px`);
        style.setProperty('--title-scale', (1 - introExit * 0.08).toFixed(4));
        style.setProperty('--title-opacity', (1 - introExit).toFixed(4));

        // Math corrected fields (no string concatenation with numbers)
        const bridgeY = (isReduced ? 0 : mouseY * 8) + sharedHeroY - frame2.exit * 760;
        style.setProperty('--bridge-x', `calc(-50% + ${isReduced ? 0 : (mouseX * 18).toFixed(2)}px)`);
        style.setProperty('--bridge-y', `${bridgeY.toFixed(2)}px`);
        style.setProperty('--bridge-bottom', `${(5 - frame2.enter * 13).toFixed(2)}vh`);
        style.setProperty('--bridge-width', `${(67.2 + frame2.enter * 37.8).toFixed(2)}vw`);
        style.setProperty('--bridge-scale', (1.02 + sharedHeroScale + frame2.exit * 0.46).toFixed(4));

        const splitLeftY = (isReduced ? 0 : mouseY * 10) + sharedHeroY - splitDrift * 180;
        style.setProperty('--split-left-x', `calc(-50% + ${(-splitDrift * 46).toFixed(2)}vw + ${isReduced ? 0 : (mouseX * 22).toFixed(2)}px)`);
        style.setProperty('--split-left-y', `${splitLeftY.toFixed(2)}px`);
        style.setProperty('--split-left-scale', (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));
        
        const splitRightY = (isReduced ? 0 : mouseY * 10) + sharedHeroY - splitDrift * 180;
        style.setProperty('--split-right-x', `calc(-50% + ${(splitDrift * 46).toFixed(2)}vw + ${isReduced ? 0 : (mouseX * 22).toFixed(2)}px)`);
        style.setProperty('--split-right-y', `${splitRightY.toFixed(2)}px`);
        style.setProperty('--split-right-scale', (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));

        const frame2Y = (isReduced ? 0 : mouseY * 8) - frame2.exit * 150;
        style.setProperty('--frame2-opacity', frame2Opacity.toFixed(4));
        style.setProperty('--frame2-x', `calc(-50% + ${isReduced ? 0 : (mouseX * 10).toFixed(2)}px)`);
        style.setProperty('--frame2-y', `calc(-50% + ${frame2Y.toFixed(2)}px)`);
        style.setProperty('--frame2-scale', (1.06 + frame2.enter * 0.08 + frame2.exit * 0.08).toFixed(4));

        style.setProperty('--intro-copy-y', `${(introExit * 90).toFixed(2)}px`);
        style.setProperty('--intro-copy-opacity', (1 - introExit).toFixed(4));
        style.setProperty('--panel2-opacity', panel2Opacity.toFixed(4));
        style.setProperty('--panel2-y', `calc(-50% + ${(-frame2.exit * 86 + (1 - frame2.enter) * 58).toFixed(2)}px)`);
        style.setProperty('--panel3-opacity', panel3Opacity.toFixed(4));
        style.setProperty('--panel3-y', `calc(-50% + ${(-frame3.exit * 86 + (1 - frame3.enter) * 58).toFixed(2)}px)`);

        style.setProperty('--sights-opacity', sightsEnter.toFixed(4));
        style.setProperty('--sights-controls-opacity', sightsControlsEnter.toFixed(4));
        
        style.setProperty('--sights-visibility', sightsEnter > 0.01 ? 'visible' : 'hidden');
        style.setProperty('--sights-y', '0px');
        style.setProperty('--sights-enter-x', `${((1 - sightsEnter) * 420).toFixed(2)}vw`);
        style.setProperty('--sights-scale', (1 / backScale).toFixed(4));
        style.setProperty('--sights-top', `${sightsParentTop.toFixed(2)}px`);
        style.setProperty('--sights-screen-top', `${sightsScreenTop.toFixed(2)}px`);
      }

      if (controlsRef.current) {
        controlsRef.current.classList.toggle('is-ready', sightsControlsEnter > 0.98);
      }

      // Check if animation should keep ticking
      const isScrolling = Math.abs(state.smoothScroll - state.targetScroll) > 0.08;
      const isMovingMouse = Math.abs(state.mouseX - state.targetMouseX) > 0.001 || Math.abs(state.mouseY - state.targetMouseY) > 0.001;

      if (isScrolling || isMovingMouse) {
        requestAnimationFrame(update);
      } else {
        state.rafPending = false;
      }
    };

    const requestTick = () => {
      const state = stateRef.current;
      if (!state.rafPending) {
        state.rafPending = true;
        requestAnimationFrame(update);
      }
    };

    // Listeners
    const handleScroll = () => requestTick();
    
    const handleResize = () => {
      stateRef.current.innerWidth = window.innerWidth;
      stateRef.current.innerHeight = window.innerHeight;
      updateSightSlider();
      requestTick();
    };

    const handlePointerMove = (e) => {
      const state = stateRef.current;
      state.targetMouseX = e.clientX / state.innerWidth - 0.5;
      state.targetMouseY = e.clientY / state.innerHeight - 0.5;
      requestTick();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Slider setup with timeout to allow client browser layout to draw
    const timeout = setTimeout(() => {
      updateSightSlider();
      requestTick();
    }, 150);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  // Slider Math
  const updateSightSlider = () => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.children;
    if (cards.length === 0) return;

    const state = stateRef.current;
    const activeIndex = state.activeSight;
    const firstCard = cards[0];
    const cardWidth = firstCard.offsetWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || '0');
    
    const shift = -(cardWidth + gap) * activeIndex;
    
    // Set custom property on stage
    if (stageRef.current) {
      stageRef.current.style.setProperty('--sights-shift', `${shift}px`);
    }

    setActiveCardIndex(activeIndex);
  };

  const moveSightSlider = (dir) => {
    const state = stateRef.current;
    state.activeSight += dir;
    updateSightSlider();
  };

  const selectSightCard = (globalIndex) => {
    const state = stateRef.current;
    state.activeSight = globalIndex;
    updateSightSlider();
  };

  const jumpSightSlider = (i) => {
    const track = trackRef.current;
    if (!track) return;
    track.classList.add('is-jumping');
    stateRef.current.activeSight = i;
    updateSightSlider();

    // double rAF to clean transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.classList.remove('is-jumping');
      });
    });
  };

  const handleTransitionEnd = () => {
    const state = stateRef.current;
    const originalCount = state.originalSightCount;
    const active = state.activeSight;

    if (active >= originalCount * 2) {
      jumpSightSlider(active - originalCount);
    } else if (active < originalCount) {
      jumpSightSlider(active + originalCount);
    }
  };

  return (
    <main className="site-shell" ref={containerRef}>
      <section className="cinema-scroll" id="cinema" aria-label="Mostar cinematic scroll story">
        <div className="stage" ref={stageRef}>
          <div className="world">
            {/* Sky Background */}
            <img 
              className="scene-img sky-img" 
              src="https://raft-blast-61784561.figma.site/_assets/v11/16b5007d9c93971e26ffe4e0e3e37946f6bd538c.png" 
              alt="" 
            />

            {/* Header Navigation */}
            <header className="site-header" aria-label="Primary navigation">
              <a className="site-logo" href="#cinema">TenderBridge</a>
              <nav className="site-nav" aria-label="Main menu">
                <a href="#cinema">Intro</a>
                <a href="#bridge">Transparency</a>
                <a href="#bazaar">Marketplace</a>
                <a href="#tenders">Live Tenders</a>
              </nav>
              <button 
                className="role-switcher-btn"
                style={{ justifySelf: 'end', background: 'rgba(74,185,224,0.1)', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                onClick={onEnterPortal}
              >
                Open Portal
              </button>
            </header>

            {/* Parallax layers background stack */}
            <div className="back-stack">
              <img 
                className="scene-img back-img back-four" 
                src="https://raft-blast-61784561.figma.site/_assets/v11/8a7f8af50e0ce92ec2e228e7b0b4112178c51cf1.png" 
                alt="" 
              />
              
              {/* Infinite Sights Slider */}
              <section className="sights-slider" aria-label="Mostar sights slider">
                <div 
                  className="sights-track" 
                  ref={trackRef}
                  onTransitionEnd={handleTransitionEnd}
                >
                  {allCards.map((card) => {
                    const isCardActive = activeCardIndex === card.globalIndex;
                    return (
                      <article 
                        key={card.uniqueKey}
                        className={`sight-card ${isCardActive ? 'is-active' : ''}`}
                        tabIndex={0}
                        role="button"
                        onClick={() => selectSightCard(card.globalIndex)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            selectSightCard(card.globalIndex);
                          }
                        }}
                      >
                        <span className="sight-kicker">{card.kicker}</span>
                        <img className="sight-pin" src={card.pin} alt="" />
                        <h3>{card.title}</h3>
                        <p>{card.description}</p>
                      </article>
                    );
                  })}
                </div>
              </section>

              <img 
                className="scene-img back-img back-bazaar" 
                src="https://raft-blast-61784561.figma.site/_assets/v11/864afe00e41e2fa20a5aa546e15cb807e0f81384.png" 
                alt="" 
              />
            </div>

            {/* Slider Navigation Buttons */}
            <div className="sights-controls" ref={controlsRef} aria-label="Slider controls">
              <button 
                className="sight-nav sight-prev" 
                onClick={() => moveSightSlider(-1)}
                aria-label="Previous tender card"
              >
                &larr;
              </button>
              <button 
                className="sight-nav sight-next" 
                onClick={() => moveSightSlider(1)}
                aria-label="Next tender card"
              >
                &rarr;
              </button>
            </div>

            {/* Display Hero Title */}
            <h1 className="hero-title">TENDER</h1>

            {/* Parallax Bridge / Foreground elements */}
            <img 
              className="scene-img splitframe-img splitframe-left" 
              src="https://raft-blast-61784561.figma.site/_assets/v11/7536d7b60a1fce482cf6edf3f0bffd3bad5d0f8a.png" 
              alt="" 
            />
            <img 
              className="scene-img splitframe-img splitframe-right" 
              src="https://raft-blast-61784561.figma.site/_assets/v11/392db6a6a6b98e868bd7f8d3f55bb719d51e5028.png" 
              alt="" 
            />
            
            <img 
              className="scene-img bridge-img" 
              src="https://raft-blast-61784561.figma.site/_assets/v11/c6a6d8ef49bca43f708aa852692942c45ec950d4.png" 
              alt="" 
            />
            
            <img 
              className="scene-img frame-two-img" 
              src="https://raft-blast-61784561.figma.site/_assets/v11/ba75252bab2b1c510987b74837770f7bc8a6b2d4.png" 
              alt="" 
            />

            {/* Screen Shade Overlay */}
            <div className="shade"></div>
          </div>

          {/* Copy Sections that reveal on scroll */}
          <section className="intro-copy" aria-label="Tender Bridge overview">
            <p>
              Seamless procurement, verified contractor channels, and automated bid comparison. 
              Bridging the gap between project issuers and industrial builders.
            </p>
            <div className="hero-tags" aria-label="Tender highlights">
              <span>Automated Auditing</span>
              <span>Encrypted Bids</span>
              <span>Fast Verification</span>
            </div>
          </section>

          {/* Story Panel 2 (Bridge Details) */}
          <section className="story-panel story-panel-bridge" id="bridge" aria-label="Transparency statistics">
            <h2>Transparency is our bridge.</h2>
            <p>
              By structuring bid worksheets and compiling proposals automatically, 
              TenderBridge establishes audit-compliant comparisons that mitigate procurement friction.
            </p>
            <dl className="facts">
              <div>
                <dt>65%</dt>
                <dd>Reduction in average bid evaluation timelines</dd>
              </div>
              <div>
                <dt>100%</dt>
                <dd>Immutable encryption on submitted cost spreadsheets</dd>
              </div>
            </dl>
          </section>

          {/* Story Panel 3 (Bazaar Details) */}
          <section className="story-panel story-panel-bazaar" id="bazaar" aria-label="Contractor portal details">
            <h2>A verified matching hub.</h2>
            <p>
              Contractors gain access to curated opportunities. Automated notifications alert 
              suppliers when tenders matching their licensing profiles are published.
            </p>
            <button 
              className="note-button"
              onClick={onEnterPortal}
            >
              <span>&rarr;</span>
              <span>Access Secure Portal</span>
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
