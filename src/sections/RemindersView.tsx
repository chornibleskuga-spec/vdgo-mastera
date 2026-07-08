import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, StickyNote, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { NoteStatus } from '@/types';
import { NOTE_STATUS_COLORS } from '@/types';

interface NoteItem {
  id: number;
  date: string;
  text: string;
  status: NoteStatus;
  createdAt: Date;
}

interface RemindersViewProps {
  getNotesByDate: (date: string) => NoteItem[];
  getDatesWithNotes: () => string[];
  addNote: (date: string, text: string) => void;
  removeNote: (id: number) => void;
  updateNoteStatus?: (id: number, status: NoteStatus) => void;
}

const STATUS_ICONS = {
  'Выполнен': CheckCircle2,
  'В процессе': Clock,
  'Не решен': AlertCircle,
};

export const RemindersView = ({
  getNotesByDate,
  getDatesWithNotes,
  addNote,
  removeNote,
  updateNoteStatus,
}: RemindersViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [noteText, setNoteText] = useState('');
  const [statusFilter, setStatusFilter] = useState<NoteStatus | 'Все'>('Все');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const datesWithNotes = getDatesWithNotes();
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  let notes = getNotesByDate(selectedDateStr);

  if (statusFilter !== 'Все') {
    notes = notes.filter(n => n.status === statusFilter);
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote(selectedDateStr, noteText);
    setNoteText('');
  };

  const statusBadge = (status: NoteStatus) => {
    const colors = NOTE_STATUS_COLORS[status];
    const Icon = STATUS_ICONS[status];
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
        <Icon size={10} />
        {status}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col md:flex-row p-4 md:p-8 gap-4 md:gap-6 overflow-hidden">
      {/* Calendar */}
      <div className="w-full md:w-[380px] flex-shrink-0">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-[14px] font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
              {format(currentMonth, 'LLLL yyyy', { locale: ru })}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7">
            {weekDays.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold py-2" style={{ color: 'var(--text-tertiary)' }}>{d}</div>
            ))}
            {days.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const hasNote = datesWithNotes.includes(format(day, 'yyyy-MM-dd'));
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className="relative w-full aspect-square flex items-center justify-center text-[13px] font-medium transition-all rounded-md mx-[1px] my-[1px]"
                  style={{
                    background: isSelected ? 'var(--accent)' : isToday ? 'var(--bg-tertiary)' : 'transparent',
                    color: isSelected ? '#fff' : !isCurrentMonth ? 'var(--text-tertiary)' : isWeekend ? '#D13438' : 'var(--text-primary)',
                    opacity: isCurrentMonth ? 1 : 0.35,
                    outline: isToday && !isSelected ? '1px solid var(--accent)' : 'none',
                    outlineOffset: '-1px',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'var(--bg-tertiary)' : 'transparent'; }}
                >
                  {format(day, 'd')}
                  {hasNote && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? '#fff' : 'var(--accent)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(10,132,255,0.12)' }}>
                <CalendarDays size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
                </h2>
                <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  {notes.length} {notes.length === 1 ? 'заметка' : notes.length < 5 ? 'заметки' : 'заметок'}
                </p>
              </div>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2 flex-wrap">
              {(['Все', 'Не решен', 'В процессе', 'Выполнен'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-3 py-1 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: statusFilter === s ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: statusFilter === s ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Add note */}
          <div className="px-5 py-3 border-b border-[var(--border)] flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                placeholder="Новая заметка..."
                className="flex-1 rounded-lg px-3 py-2 text-[13px] outline-none"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="px-3 py-2 rounded-lg text-white text-[13px] font-medium disabled:opacity-40 transition-all"
                style={{ background: 'var(--accent)' }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {notes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <StickyNote size={32} style={{ color: 'var(--text-tertiary)' }} className="mb-3 opacity-40" />
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  {statusFilter === 'Все' ? 'Нет заметок на этот день' : `Нет заметок со статусом "${statusFilter}"`}
                </p>
              </div>
            )}
            {notes.map(note => (
              <div
                key={note.id}
                className="rounded-xl p-3 transition-all hover:shadow-md"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--text-primary)' }}>{note.text}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(note.status)}
                      {updateNoteStatus && (
                        <div className="flex items-center gap-1">
                          {(['Не решен', 'В процессе', 'Выполнен'] as NoteStatus[]).map(s => (
                            <button
                              key={s}
                              onClick={() => updateNoteStatus(note.id, s)}
                              className="text-[10px] px-1.5 py-0.5 rounded transition-all"
                              style={{
                                background: note.status === s ? NOTE_STATUS_COLORS[s].bg : 'transparent',
                                color: note.status === s ? NOTE_STATUS_COLORS[s].text : 'var(--text-tertiary)',
                                border: note.status === s ? `1px solid ${NOTE_STATUS_COLORS[s].border}` : '1px solid transparent',
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeNote(note.id)}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
