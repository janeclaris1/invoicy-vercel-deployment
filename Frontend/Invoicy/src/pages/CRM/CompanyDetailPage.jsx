import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Building2, Globe, Phone, MapPin, Loader2, User } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const CompanyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCompany = async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get(API_PATHS.CRM.COMPANY(id));
      setCompany(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error("Company not found");
        navigate("/crm/companies", { replace: true });
      } else {
        toast.error(err.response?.data?.message || "Failed to load company");
      }
    }
  };

  const fetchContacts = async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get(API_PATHS.CRM.CONTACTS, { params: { company: id } });
      setContacts(Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      setContacts([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCompany(), fetchContacts()]);
      setLoading(false);
    };
    load();
  }, [id]);

  const fullName = (c) => (c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : "—");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/crm/companies" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          Back to companies
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">{company.name}</h2>
            </div>
            {company.website && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Globe className="w-4 h-4 flex-shrink-0" />
                <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 truncate">
                  {company.website}
                </a>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href={`tel:${company.phone}`} className="hover:text-blue-600">{company.phone}</a>
              </div>
            )}
            {company.address && (
              <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{company.address}</span>
              </div>
            )}
            {company.industry && <p className="text-sm text-gray-500 mt-2">Industry: {company.industry}</p>}
            {company.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</p>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Contacts at this company ({contacts.length})</h3>
            </div>
            {contacts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No contacts linked to this company yet.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {contacts.map((c) => (
                  <li key={c._id} className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/crm/contacts/${c._id}`)}
                      className="flex items-center gap-3 w-full text-left hover:bg-gray-50 -mx-6 px-6 py-2 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{fullName(c)}</p>
                        {c.email && <p className="text-sm text-gray-500">{c.email}</p>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
