/**
 * ChatStack.jsx — Inner screen content (rendered via drei <Html>).
 *
 * Looks like a WhatsApp / iMessage conversation : Aïcha → bot → Lina.
 * Staggered with chatBubble variants (motion library shared).
 */
import { motion } from 'framer-motion';
import { chatBubble } from '../lib/motion';

export default function ChatStack() {
  return (
    <div
      style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(180deg, #F5F1E8 0%, #EDE7DA 100%)',
        borderRadius: 30,
        padding: '38px 14px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
        fontFamily: "'Geist', system-ui, sans-serif",
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Status bar */}
      <div style={{
        position: 'absolute', top: 12, left: 24, right: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 11, fontWeight: 600, color: '#1A1A1A',
      }}>
        <span>8:02</span>
        <span style={{ width: 50, height: 12, background: '#1A1A1A', borderRadius: 4 }} />
        <span>5G · 87%</span>
      </div>

      {/* Conversation header */}
      <div style={{
        marginTop: 12,
        display: 'flex', alignItems: 'center', gap: 8,
        paddingBottom: 8, borderBottom: '1px solid rgba(26,26,26,0.06)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #C2613E, #7B8B6F)',
          display: 'grid', placeItems: 'center', fontSize: 14,
        }}>🌱</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', lineHeight: 1 }}>
            ParentAtEase
          </div>
          <div style={{ fontSize: 9, color: '#7B8B6F', marginTop: 2, fontWeight: 500 }}>
            en ligne
          </div>
        </div>
      </div>

      <div style={{ fontSize: 9, color: '#8A8378', textAlign: 'center', margin: '4px 0' }}>
        Mardi · 19h42
      </div>

      {/* Bubble 1 — parent (Aïcha) */}
      <motion.div
        {...chatBubble(0.6)}
        style={{
          alignSelf: 'flex-end',
          maxWidth: '78%',
          background: '#1A1A1A',
          color: '#F5F1E8',
          padding: '8px 12px',
          borderRadius: '16px 16px 4px 16px',
          fontSize: 11,
          lineHeight: 1.4,
          fontWeight: 500,
        }}
      >
        Lina refuse d'aller au lit, elle pleure. J'en peux plus.
      </motion.div>

      {/* Bubble 2 — bot (rich content) */}
      <motion.div
        {...chatBubble(1.4)}
        style={{
          alignSelf: 'flex-start',
          maxWidth: '88%',
          background: '#FFFFFF',
          color: '#1A1A1A',
          padding: '10px 12px',
          borderRadius: '16px 16px 16px 4px',
          fontSize: 11,
          lineHeight: 1.45,
          border: '1px solid rgba(26,26,26,0.06)',
          fontFamily: "'Geist', system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 9, color: '#7B8B6F', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Étienne · Sommeil
        </div>
        <div style={{ fontWeight: 600 }}>
          Pose-toi à côté de son lit, sans rien dire.
        </div>
        <div style={{ marginTop: 4, color: '#4A4A48' }}>
          3 minutes. Sa colère a besoin d'un témoin avant d'avoir besoin d'une solution.
        </div>
      </motion.div>

      {/* Bubble 3 — Lina */}
      <motion.div
        {...chatBubble(2.2)}
        style={{
          alignSelf: 'flex-end',
          maxWidth: '70%',
          background: '#C2613E',
          color: '#F5F1E8',
          padding: '8px 12px',
          borderRadius: '16px 16px 4px 16px',
          fontSize: 11,
          lineHeight: 1.4,
          fontWeight: 500,
          fontStyle: 'italic',
        }}
      >
        « Maman… reste encore un peu. » <br/>
        <span style={{ fontSize: 8, opacity: 0.7, fontStyle: 'normal' }}>— Lina, 20h14 🌙</span>
      </motion.div>

      {/* Input bar (decorative) */}
      <div style={{
        marginTop: 'auto',
        background: '#FFFFFF',
        border: '1px solid rgba(26,26,26,0.08)',
        borderRadius: 20,
        padding: '6px 12px',
        fontSize: 10,
        color: '#8A8378',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>Écris un message…</span>
        <span style={{
          width: 18, height: 18, borderRadius: '50%', background: '#7B8B6F',
          display: 'grid', placeItems: 'center', color: '#F5F1E8', fontSize: 9,
        }}>▶</span>
      </div>
    </div>
  );
}
