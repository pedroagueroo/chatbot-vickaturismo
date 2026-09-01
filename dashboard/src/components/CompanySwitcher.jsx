import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Plus, Search, Settings } from 'lucide-react';

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const SEARCH_THRESHOLD = 6;

export const CompanySwitcher = ({ businesses, selectedBusinessId, onSelect, collapsed }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const optionRefs = useRef([]);

  const navigate = useNavigate();
  const location = useLocation();
  const isGlobalRoute = location.pathname.startsWith('/admin');

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);

  const filteredBusinesses = useMemo(() => {
    if (!query.trim()) return businesses;
    const q = query.trim().toLowerCase();
    return businesses.filter((b) => b.name.toLowerCase().includes(q));
  }, [businesses, query]);

  const showSearch = businesses.length > SEARCH_THRESHOLD;

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelWidth = collapsed ? 288 : Math.max(rect.width, 260);

    if (collapsed) {
      const left = Math.min(rect.right + 8, window.innerWidth - panelWidth - 8);
      setPosition({ top: rect.top, left: Math.max(8, left), width: panelWidth });
    } else {
      const left = Math.min(rect.left, window.innerWidth - panelWidth - 8);
      setPosition({ top: rect.bottom + 6, left: Math.max(8, left), width: panelWidth });
    }
  };

  const closePanel = (refocusTrigger = true) => {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
    if (refocusTrigger) triggerRef.current?.focus();
  };

  const openPanel = () => {
    updatePosition();
    setOpen(true);
    setActiveIndex(-1);
  };

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handleReposition = () => updatePosition();
    const handleClickOutside = (e) => {
      if (
        panelRef.current?.contains(e.target) ||
        triggerRef.current?.contains(e.target)
      ) {
        return;
      }
      closePanel(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePanel(true);
      }
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    if (showSearch) {
      searchRef.current?.focus();
    } else if (filteredBusinesses.length > 0) {
      setActiveIndex(0);
    }

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, showSearch]);

  useEffect(() => {
    if (activeIndex >= 0 && optionRefs.current[activeIndex]) {
      optionRefs.current[activeIndex].focus();
    }
  }, [activeIndex]);

  const handleListKeyDown = (e) => {
    if (filteredBusinesses.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredBusinesses.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? filteredBusinesses.length - 1 : prev - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(filteredBusinesses.length - 1);
    }
  };

  const handleSelect = (id) => {
    onSelect(id);
    closePanel(true);
  };

  const contextLabel = isGlobalRoute ? 'Acceso rápido' : 'Empresa activa';

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Cambiar empresa activa"
        onClick={() => (open ? closePanel(false) : openPanel())}
        title={selectedBusiness?.name || 'Seleccionar empresa'}
        aria-controls="company-switcher-listbox"
        className={`w-full flex items-center gap-2.5 surface-glass rounded-md text-left transition-all duration-150 cursor-pointer hover:brightness-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-600 ${
          collapsed ? 'md:justify-center md:mx-auto md:w-10 md:h-10 md:p-0 md:rounded-xl p-2.5' : 'p-2.5'
        }`}
      >
        <div className="w-7 h-7 flex items-center justify-center rounded-md bg-teal-600 text-white text-[11px] font-bold flex-shrink-0">
          {getInitials(selectedBusiness?.name)}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-100 truncate">
                {selectedBusiness?.name || 'Sin empresas'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{contextLabel}</p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            id="company-switcher-listbox"
            role="listbox"
            aria-label="Empresas"
            onKeyDown={handleListKeyDown}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            className="z-[60] surface-glass rounded-md p-1.5 shadow-2xl space-y-1"
          >
            {showSearch && (
              <div className="relative px-1 pt-0.5 pb-1.5">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActiveIndex(0);
                    }
                  }}
                  placeholder="Buscar empresa..."
                  aria-label="Buscar empresa"
                  className="w-full surface-well rounded-md pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {filteredBusinesses.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3">
                  {businesses.length === 0 ? 'No hay empresas registradas' : 'Sin resultados'}
                </p>
              ) : (
                filteredBusinesses.map((biz, index) => {
                  const isSelected = biz.id === selectedBusinessId;
                  return (
                    <button
                      key={biz.id}
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={-1}
                      onClick={() => handleSelect(biz.id)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left text-xs transition-colors focus:outline-none ${
                        isSelected
                          ? 'bg-teal-950/60 text-teal-200'
                          : 'text-slate-300 hover:bg-slate-800/60 focus:bg-slate-800/60'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-300 text-[10px] font-bold flex-shrink-0">
                        {getInitials(biz.name)}
                      </div>
                      <span className="flex-1 truncate font-medium">{biz.name}</span>
                      {biz.status !== 'active' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                          Suspendida
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-1 border-t border-slate-700/50 space-y-0.5">
              <button
                onClick={() => {
                  closePanel(false);
                  navigate('/admin/businesses?new=1');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left text-xs font-medium text-teal-300 hover:bg-teal-950/40 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva empresa</span>
              </button>
              <button
                onClick={() => {
                  closePanel(false);
                  navigate('/admin/businesses');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left text-xs font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Gestionar empresas</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
