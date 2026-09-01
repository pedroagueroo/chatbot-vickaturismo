import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { CustomerProfile } from '../../components/chat/CustomerProfile';
import {
  Users,
  Search,
  Download,
  Edit3,
  MessageSquare,
  Mail,
  Phone,
  CreditCard,
  FileText,
  Calendar,
  X,
  Loader2,
  RefreshCw,
  UserCheck,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';

export const CustomersList = () => {
  const { businessId, businessName } = useAuth();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'WITH_EMAIL', 'WITH_DNI', 'WITH_NOTES'
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  // Modal para ver y editar la ficha del cliente
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    fetchCustomers();
  }, [businessId]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error cargando clientes:', err.message);
      toast.error('Error al cargar la lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfile = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCustomerUpdated = (updatedCustomer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
    );
    setSelectedCustomer(updatedCustomer);
  };

  // Exportar base de clientes a archivo CSV compatible con Excel
  const handleExportCSV = () => {
    if (customers.length === 0) {
      toast.error('No hay clientes para exportar');
      return;
    }

    try {
      const headers = ['Nombre', 'Teléfono', 'Email', 'DNI/Pasaporte', 'Notas Internas', 'Fecha Registro'];
      const rows = sortedCustomers.map((c) => [
        `"${(c.name || 'Sin Nombre').replace(/"/g, '""')}"`,
        `"${(c.phone || c.platform_id || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.dni || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${new Date(c.created_at || Date.now()).toLocaleDateString()}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Clientes_${(businessName || 'Empresa').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exportados ${sortedCustomers.length} clientes a CSV`);
    } catch (err) {
      console.error('Error exportando CSV:', err);
      toast.error('Error al generar el archivo CSV');
    }
  };

  // Filtros y Búsqueda
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.platform_id && c.platform_id.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.dni && c.dni.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q));

    let matchesFilter = true;
    if (filterType === 'WITH_EMAIL') matchesFilter = !!c.email;
    if (filterType === 'WITH_DNI') matchesFilter = !!c.dni;
    if (filterType === 'WITH_NOTES') matchesFilter = !!c.notes;

    return matchesSearch && matchesFilter;
  });

  // Ordenamiento por columna
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortValue = (customer, field) => {
    if (field === 'created_at') return new Date(customer.created_at || 0).getTime();
    if (field === 'phone') return (customer.phone || customer.platform_id || '').toLowerCase();
    return (customer[field] || '').toString().toLowerCase();
  };

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const valA = getSortValue(a, sortField);
    const valB = getSortValue(b, sortField);

    if (valA === '' && valB !== '') return 1;
    if (valB === '' && valA !== '') return -1;

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-teal-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-teal-400" />
    );
  };

  const SortableHeader = ({ field, children, align = 'left' }) => (
    <th className="py-3.5 px-4">
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1.5 cursor-pointer hover:text-teal-300 transition-colors ${
          align === 'right' ? 'ml-auto' : ''
        } ${sortField === field ? 'text-teal-400' : ''}`}
      >
        <span>{children}</span>
        <SortIcon field={field} />
      </button>
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-teal-500" />
            <span>Base de Clientes & Leads</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Visualizá, editá y exportá todos los contactos capturados por la IA en WhatsApp para <span className="text-teal-300 font-medium">{businessName}</span>.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchCustomers}
            title="Refrescar Lista"
            className="p-2.5 surface-well hover:brightness-125 text-slate-300 rounded-md transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-teal-600 hover:text-white border border-slate-700/80 hover:border-teal-500 text-slate-200 font-medium py-2 px-3.5 rounded-md text-xs md:text-sm transition-colors flex items-center space-x-2 cursor-pointer btn-neu"
          >
            <Download className="w-4 h-4 text-teal-400 group-hover:text-white" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 surface-glass p-3 rounded-md">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono, email, DNI o palabras clave en notas..."
            className="w-full surface-well focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-md py-2 pl-10 pr-4 text-xs md:text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: `Todos (${customers.length})` },
            { id: 'WITH_EMAIL', label: 'Con Email' },
            { id: 'WITH_DNI', label: 'Con DNI' },
            { id: 'WITH_NOTES', label: 'Con Notas / Tags' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filterType === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Clientes */}
      {loading ? (
        <div className="surface-glass rounded-md p-4 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 surface-glass rounded-md text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800/80 rounded-md flex items-center justify-center text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No se encontraron clientes</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery
                ? 'Ningún cliente coincide con los términos de búsqueda o filtros seleccionados.'
                : 'Cuando los clientes escriban por WhatsApp, aparecerán automáticamente en esta lista.'}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('ALL');
              }}
              className="text-xs text-teal-400 hover:underline font-medium cursor-pointer pt-2"
            >
              Limpiar filtros de búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="surface-glass rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <SortableHeader field="name">Cliente / Contacto</SortableHeader>
                  <SortableHeader field="phone">WhatsApp / Teléfono</SortableHeader>
                  <SortableHeader field="email">Correo Electrónico</SortableHeader>
                  <SortableHeader field="dni">DNI / Pasaporte</SortableHeader>
                  <th className="py-3.5 px-4">Notas & Preferencias</th>
                  <SortableHeader field="created_at">Registro</SortableHeader>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-sm text-slate-300">
                {sortedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-700/20 transition-colors group cursor-pointer"
                    onClick={() => handleOpenProfile(customer)}
                  >
                    {/* Cliente */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-teal-400 flex-shrink-0">
                          {customer.name?.charAt(0)?.toUpperCase() || customer.phone?.slice(-2) || 'C'}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-teal-300 transition-colors flex items-center space-x-1.5">
                            <span>{customer.name || 'Cliente sin nombre'}</span>
                          </div>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-mono">
                            WhatsApp Lead
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Teléfono */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{customer.phone || customer.platform_id}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-xs">
                      {customer.email ? (
                        <div className="flex items-center space-x-1.5 text-teal-300">
                          <Mail className="w-3.5 h-3.5 text-teal-400" />
                          <span className="truncate max-w-[180px]">{customer.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No registrado</span>
                      )}
                    </td>

                    {/* DNI */}
                    <td className="py-3.5 px-4 text-xs">
                      {customer.dni ? (
                        <div className="flex items-center space-x-1.5 font-mono text-slate-200">
                          <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                          <span>{customer.dni}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No registrado</span>
                      )}
                    </td>

                    {/* Notas */}
                    <td className="py-3.5 px-4 text-xs max-w-xs">
                      {customer.notes ? (
                        <div className="flex items-center space-x-1.5 text-slate-300 bg-slate-950/60 border border-slate-800 p-1.5 rounded">
                          <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <p className="truncate text-[11px] leading-tight">{customer.notes}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Sin notas</span>
                      )}
                    </td>

                    {/* Fecha */}
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{new Date(customer.created_at || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenProfile(customer)}
                          title="Ver Ficha CRM Completa"
                          className="px-2.5 py-1 bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/30 rounded text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ficha</span>
                        </button>
                        <button
                          onClick={() => navigate('/crm/inbox')}
                          title="Ir al Chat en Vivo"
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 bg-slate-950/30 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
            <span>Mostrando {filteredCustomers.length} de {customers.length} contactos</span>
            <span className="text-[11px] text-slate-500">Haz clic en cualquier cliente para abrir su ficha</span>
          </div>
        </div>
      )}

      {/* Modal Ficha CRM del Cliente */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="surface-glass rounded-md w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header del Modal */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">Ficha CRM del Cliente</h3>
                  <p className="text-[11px] text-slate-400">Edición en tiempo real (Sincronizado con la IA)</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal (Reutiliza CustomerProfile) */}
            <div className="p-4 overflow-y-auto flex-1">
              <CustomerProfile
                customer={selectedCustomer}
                onCustomerUpdate={handleCustomerUpdated}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
