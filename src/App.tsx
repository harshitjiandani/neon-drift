import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useGameEngine } from '@/game/useGameEngine';
import GameScene from '@/game/GameScene';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from 'lucide-react';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const { snapshot, start, pause, resume, restart, move, jump, slide } = useGameEngine();
  const active = snapshot.status === 'running';
  const openOverlay = snapshot.status !== 'running';

  return (
    <main className="game-shell">
      <GameScene
        entities={snapshot.entities}
        lane={snapshot.lane}
        jumpHeight={snapshot.jumpHeight}
        sliding={snapshot.sliding}
        running={active}
      />
      <div className="game-vignette" />

      <header className="topbar">
        <div className="brand" aria-label="Neon Drift">
          <div className="brand-mark"><span /></div>
          <div>
            <div className="brand-name">NEON DRIFT</div>
            <div className="brand-kicker">ENDLESS RUN // SECTOR 01</div>
          </div>
        </div>
        <div className="top-right">
          {active ? (
            <button className="icon-button" aria-label="Pause run" onClick={pause}><Pause size={17} /></button>
          ) : snapshot.status === 'paused' ? (
            <button className="icon-button" aria-label="Resume run" onClick={resume}><Play size={17} /></button>
          ) : snapshot.status === 'over' ? (
            <button className="icon-button" aria-label="Restart run" onClick={restart}><RotateCcw size={17} /></button>
          ) : (
            <div className="status-pill"><span className="status-dot" /> READY TO RUN</div>
          )}
        </div>
      </header>

      <section className="hud" aria-label="Run stats">
        <div className="hud-stat score-block">
          <div className="hud-label">SCORE</div>
          <div className="hud-number">{Math.floor(snapshot.score).toLocaleString()}</div>
        </div>
        <div className="hud-center">
          <div className="hud-stat">
            <div className="hud-label">BEST</div>
            <div className="hud-number">{Math.floor(snapshot.best).toLocaleString()}</div>
          </div>
          <div className="hud-stat">
            <div className="hud-label">SHARDS</div>
            <div className="hud-number shard-value">{snapshot.shards.toString().padStart(2, '0')}</div>
          </div>
          <div className="hud-stat">
            <div className="hud-label">COMBO</div>
            <div className="hud-number combo-value">×{snapshot.combo}</div>
          </div>
        </div>
        <div className="hud-stat" style={{ textAlign: 'right' }}>
          <div className="hud-label">VELOCITY</div>
          <div className="hud-number speed-value">{Math.round(snapshot.speed)}<small>KM/H</small></div>
          <div className="speed-meter"><span style={{ width: `${Math.max(8, Math.min(100, snapshot.speed))}%` }} /></div>
        </div>
      </section>

      {openOverlay && (
        <section className="overlay">
          {snapshot.status === 'ready' && (
            <div className="panel fade-in">
              <div className="eyebrow">The city never slows</div>
              <h1 className="hero-title">NEON<br /><span>DRIFT</span></h1>
              <p className="panel-copy">Three lanes. No finish line. Thread the rush, collect the light, and see how far you can make it.</p>
              <button className="primary-button" onClick={start}>ENTER THE RUN</button>
              <div className="key-hint"><b>← →</b> SHIFT&nbsp;&nbsp; <b>↑ / SPACE</b> JUMP&nbsp;&nbsp; <b>↓</b> SLIDE</div>
            </div>
          )}
          {snapshot.status === 'paused' && (
            <div className="panel fade-in">
              <div className="eyebrow">Signal held</div>
              <h2 className="paused-title">PAUSED</h2>
              <p className="panel-copy">Your line is frozen. Take a breath, then get back in.</p>
              <button className="primary-button" onClick={resume}>RESUME RUN</button>
               <div className="key-hint"><b>{Math.floor(snapshot.score).toLocaleString()}</b> POINTS SCORED</div>
            </div>
          )}
          {snapshot.status === 'over' && (
            <div className="panel fade-in">
              <div className="eyebrow">Run terminated</div>
              <h2 className="paused-title">WIPEOUT</h2>
              <p className="panel-copy">The grid got you this time. The next line is yours.</p>
              <div className="record-line">
                <div className="record-item"><span>SCORE</span><strong>{Math.floor(snapshot.score).toLocaleString()}</strong></div>
                <div className="record-item"><span>BEST SCORE</span><strong>{Math.floor(snapshot.best).toLocaleString()}</strong></div>
                <div className="record-item"><span>SHARDS</span><strong>{snapshot.shards}</strong></div>
              </div>
              <button className="primary-button" onClick={restart}>RUN IT BACK</button>
              <div className="key-hint">YOUR NEXT PERSONAL BEST IS ONE RUN AWAY</div>
            </div>
          )}
        </section>
      )}

      <footer className="bottom-controls">
        <div className="control-legend">
          <span><b className="legend-key">←</b><b className="legend-key">→</b> CHANGE LANE</span>
          <span><b className="legend-key">↑</b> JUMP</span>
          <span><b className="legend-key">↓</b> SLIDE</span>
        </div>
        <div className="touch-pad" aria-label="Touch controls">
          <button className="touch-button" aria-label="Move left" onClick={() => move(-1)}><ArrowLeft size={19} /></button>
          <button className="touch-button action" aria-label="Slide" onClick={slide}><ArrowDown size={17} /></button>
          <button className="touch-button action" aria-label="Jump" onClick={jump}><ArrowUp size={17} /></button>
          <button className="touch-button" aria-label="Move right" onClick={() => move(1)}><ArrowRight size={19} /></button>
        </div>
      </footer>
    </main>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
