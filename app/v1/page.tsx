'use client';

import { useState, useEffect } from 'react';

export default function EmbarkoV1() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = scrollTop / docHeight;
      setScrollProgress(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-white text-black overflow-x-hidden">
      {/* SCENE 01: THE OPENING */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-4xl text-center space-y-8">
          <h1 className="text-7xl md:text-8xl font-bold leading-tight tracking-tight">
            Your AI builds it.
            <br />
            Embarko runs it.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 font-light">
            The easiest way to put your AI-built app online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button className="px-8 py-4 bg-black text-white text-lg font-medium hover:bg-gray-900 transition">
              Teach your AI to ship →
            </button>
            <button className="px-8 py-4 border border-black text-black text-lg font-medium hover:bg-black hover:text-white transition">
              See how it works ↓
            </button>
          </div>
        </div>
      </section>

      {/* SCENE 02: SOMETHING IS BEING BUILT */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20 bg-gradient-to-b from-white via-blue-50 to-white">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-gray-600">You:</div>
              <div className="text-2xl font-light">
                Build me a personal portfolio.
              </div>
            </div>
            <div className="pt-8 space-y-4 border-t border-gray-200">
              <div className="text-gray-600">AI:</div>
              <div className="text-2xl font-light">
                Creating your portfolio now...
              </div>
            </div>
          </div>
          <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-2 border-black rounded-full animate-spin mx-auto" />
              <div className="text-gray-600 font-light">Building your portfolio...</div>
            </div>
          </div>
        </div>
      </section>

      {/* SCENE 03: THE QUESTION */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl w-full space-y-12">
          <div className="text-center space-y-4">
            <div className="text-gray-600 text-xl">You:</div>
            <h2 className="text-6xl md:text-7xl font-bold">Now what?</h2>
          </div>
          <div className="text-center space-y-4 pt-12 border-t border-gray-200">
            <div className="text-gray-600 text-xl">Embarko:</div>
            <p className="text-4xl md:text-5xl font-light">
              Deploy it to Embarko.
            </p>
          </div>
        </div>
      </section>

      {/* SCENE 04: THE MAGIC */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-gradient-to-b from-blue-50 via-white to-blue-50">
        <div className="max-w-4xl w-full text-center space-y-12">
          <div className="space-y-8">
            <div className="animate-pulse">
              <div className="text-6xl font-bold text-gray-400 mb-4">✨</div>
              <p className="text-2xl font-light text-gray-600">Deploying...</p>
            </div>
          </div>
          <div className="pt-12 border-t border-gray-200 space-y-8">
            <h3 className="text-7xl font-bold">It's live.</h3>
            <div className="text-2xl font-light text-gray-600 space-y-2">
              <p>portfolio.embarko.app</p>
              <p className="text-green-600 font-medium">● Live</p>
            </div>
            <button className="px-8 py-4 bg-black text-white text-lg font-medium hover:bg-gray-900 transition">
              Open app →
            </button>
          </div>
        </div>
      </section>

      {/* SCENE 05: HOW? */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl w-full space-y-16">
          <h2 className="text-6xl font-bold text-center">How?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="text-6xl font-bold text-gray-300">01</div>
              <h3 className="text-2xl font-light">Build with your AI.</h3>
            </div>
            <div className="space-y-4">
              <div className="text-6xl font-bold text-gray-300">02</div>
              <h3 className="text-2xl font-light">Teach it Embarko.</h3>
              <button className="text-black underline font-medium hover:no-underline">
                Copy prompt →
              </button>
            </div>
            <div className="space-y-4">
              <div className="text-6xl font-bold text-gray-300">03</div>
              <h3 className="text-2xl font-light">Tell it to deploy.</h3>
              <p className="text-gray-600 italic">Deploy this to Embarko.</p>
            </div>
          </div>
          <div className="text-center pt-12 border-t border-gray-200">
            <h3 className="text-6xl font-bold">Live.</h3>
          </div>
        </div>
      </section>

      {/* SCENE 06: THE PAIN REMOVED */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20 bg-gray-50">
        <div className="max-w-4xl w-full space-y-12">
          <h2 className="text-5xl font-light text-center">Your app is ready.</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              {['Hosting', 'Domains', 'Login', 'Data', 'Files', 'Security', 'Deployments', 'Backups', 'CDN'].map((item, i) => (
                <div key={i} className="p-4 bg-white border border-gray-200 rounded text-gray-600 font-light">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="text-center space-y-8 pt-12 border-t border-gray-300">
            <h3 className="text-7xl font-bold">Embarko</h3>
            <p className="text-3xl font-light">Your app is live.</p>
          </div>
        </div>
      </section>

      {/* SCENE 07: WHAT CAN I BUILD */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-5xl w-full space-y-16">
          <h2 className="text-6xl font-bold text-center">What are you building?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Portfolio', desc: 'Show your work.' },
              { title: 'Personal website', desc: 'Your own corner of the internet.' },
              { title: 'Interactive CV', desc: 'More than a PDF.' },
              { title: 'AI tool', desc: 'Turn an idea into something people can use.' },
              { title: 'Expense tracker', desc: 'Your money. Your app.' },
              { title: 'Habit planner', desc: 'Build the tool you wish existed.' },
              { title: 'Quiz / flashcards', desc: 'Learn your way.' },
              { title: 'Calculator', desc: 'Simple idea. Real app.' },
              { title: 'Game', desc: 'Make something fun.' },
            ].map((app, i) => (
              <div key={i} className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg space-y-3 hover:shadow-lg transition">
                <h3 className="text-xl font-bold">{app.title}</h3>
                <p className="text-gray-600 font-light">{app.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center pt-12 border-t border-gray-200">
            <h3 className="text-5xl font-bold">If you can build it,</h3>
            <p className="text-4xl font-light mt-2">you can put it online.</p>
          </div>
        </div>
      </section>

      {/* SCENE 08: THE SKY */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-lg blur-2xl" />
          <div className="absolute bottom-20 right-20 w-52 h-52 bg-white rounded-lg blur-3xl" />
        </div>
        <div className="max-w-6xl w-full relative z-10 space-y-12">
          <h2 className="text-6xl font-bold text-center">A world of things you've built.</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {['Portfolio', 'AI Tool', 'Game', 'Dashboard', 'Website', 'Calculator'].map((app, i) => (
              <div
                key={i}
                className="aspect-video bg-white border border-gray-200 rounded-lg shadow-lg flex items-center justify-center animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <p className="text-gray-600 font-light">{app}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCENE 09: THE REALIZATION */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl w-full space-y-12">
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center space-y-8 p-8">
            <div className="text-center space-y-4">
              <p className="text-xl font-light text-gray-600">Sign in</p>
              <p className="text-xl font-light text-gray-600">It remembers</p>
              <p className="text-xl font-light text-gray-600">Upload</p>
              <p className="text-xl font-light text-gray-600">Live</p>
            </div>
          </div>
          <div className="text-center space-y-4">
            <h3 className="text-5xl font-bold">This isn't just a page.</h3>
            <p className="text-2xl font-light text-gray-600">It's a real application.</p>
          </div>
        </div>
      </section>

      {/* SCENE 10: BUILD YOUR WAY */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20 bg-gray-50">
        <div className="max-w-4xl w-full text-center space-y-12">
          <h2 className="text-6xl font-bold">Build your way.</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {['Claude', 'Codex', 'Cursor', 'Lovable', 'Replit'].map((ai, i) => (
              <div key={i} className="px-6 py-3 bg-white border border-gray-200 rounded-full font-light">
                {ai}
              </div>
            ))}
            <div className="px-6 py-3 bg-white border border-gray-200 rounded-full font-light text-gray-600">
              + more
            </div>
          </div>
          <p className="text-xl font-light text-gray-600">
            Embarko works with the AI you already use.
          </p>
        </div>
      </section>

      {/* SCENE 11: THE POSSIBILITIES */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-blue-50">
        <div className="max-w-4xl w-full relative z-10 space-y-12">
          <div className="grid md:grid-cols-2 gap-6">
            {['Portfolio', 'Personal site', 'AI app', 'Game', 'Student project', 'Tool', 'Dashboard', 'Community'].map((app, i) => (
              <div
                key={i}
                className="aspect-video bg-white border border-gray-200 rounded-lg shadow-md flex items-center justify-center hover:shadow-xl transition"
              >
                <p className="text-gray-600 font-light">{app}</p>
              </div>
            ))}
          </div>
          <div className="text-center pt-12 border-t border-gray-200 space-y-8">
            <h2 className="text-6xl font-bold">What will you build?</h2>
          </div>
        </div>
      </section>

      {/* SCENE 12: THE CORE IDEA */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl text-center space-y-8">
          <h2 className="text-7xl md:text-8xl font-bold leading-tight">
            Don't learn hosting.
            <br />
            Build something.
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 font-light">
            Your time is better spent making the thing.
          </p>
        </div>
      </section>

      {/* SCENE 13: FINAL FRAME */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20 space-y-16">
        <div className="max-w-4xl text-center space-y-12">
          <h2 className="text-7xl font-bold">Your AI already built it.</h2>
          <h3 className="text-6xl font-light text-gray-600">Let it ship it.</h3>
          <div className="pt-12 space-y-6 border-t border-gray-200">
            <p className="text-xl font-light text-gray-600">
              Teach your AI to ship with Embarko.
            </p>
            <button className="px-8 py-4 bg-black text-white text-lg font-medium hover:bg-gray-900 transition">
              Teach your AI to ship →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
