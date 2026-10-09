"use client";

import React, { useState, useMemo } from "react";

export interface DegreeProgramme {
  id: string;
  code: string;
  name: string;
  degreeType: string;
  credits: number;
  requiredHours: number;
  leadCoordinator: string;
  activeStudents: number;
  status: "active" | "archived";
}

const INITIAL_PROGRAMMES: DegreeProgramme[] = [
  {
    id: "prog-1",
    code: "TIK",
    name: "Information and Communications Technology",
    degreeType: "Bachelor of Engineering (B.Eng.)",
    credits: 30,
    requiredHours: 800,
    leadCoordinator: "Mikko Laine",
    activeStudents: 64,
    status: "active",
  },
  {
    id: "prog-2",
    code: "MED",
    name: "Media Engineering",
    degreeType: "Bachelor of Engineering (B.Eng.)",
    credits: 30,
    requiredHours: 800,
    leadCoordinator: "Hanna Peltonen",
    activeStudents: 42,
    status: "active",
  },
  {
    id: "prog-3",
    code: "TER",
    name: "Health Technology",
    degreeType: "Bachelor of Engineering (B.Eng.)",
    credits: 30,
    requiredHours: 800,
    leadCoordinator: "Jari Virtanen",
    activeStudents: 38,
    status: "active",
  },
  {
    id: "prog-4",
    code: "TUT",
    name: "Industrial Management",
    degreeType: "Bachelor of Engineering (B.Eng.)",
    credits: 30,
    requiredHours: 800,
    leadCoordinator: "Sanna Aalto",
    activeStudents: 25,
    status: "active",
  },
  {
    id: "prog-5",
    code: "LII",
    name: "International Business and Logistics",
    degreeType: "Bachelor of Business Administration (BBA)",
    credits: 30,
    requiredHours: 800,
    leadCoordinator: "Antti Heinonen",
    activeStudents: 16,
    status: "active",
  },
];

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<DegreeProgramme[]>(INITIAL_PROGRAMMES);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProg, setEditingProg] = useState<DegreeProgramme | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states for Add Programme
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDegreeType, setNewDegreeType] = useState("Bachelor of Engineering (B.Eng.)");
  const [newCredits, setNewCredits] = useState(30);
  const [newHours, setNewHours] = useState(800);
  const [newCoordinator, setNewCoordinator] = useState("Mikko Laine");

  const filteredProgrammes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return programmes;
    return programmes.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.leadCoordinator.toLowerCase().includes(q)
    );
  }, [programmes, searchQuery]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProg) return;

    setProgrammes((prev) =>
      prev.map((p) => (p.id === editingProg.id ? editingProg : p))
    );
    setEditingProg(null);
  };

  const handleAddProgramme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    const created: DegreeProgramme = {
      id: `prog-${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      degreeType: newDegreeType,
      credits: Number(newCredits) || 30,
      requiredHours: Number(newHours) || 800,
      leadCoordinator: newCoordinator,
      activeStudents: 0,
      status: "active",
    };

    setProgrammes((prev) => [...prev, created]);
    setNewCode("");
    setNewName("");
    setIsAddOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Controls */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Degree programmes
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Curriculum internship requirements, credit thresholds, and designated coordinators
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
          <div className="flex flex-col gap-1">
            <label htmlFor="search-prog" className="text-xs font-semibold text-ink">
              Search programmes
            </label>
            <input
              id="search-prog"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Code or programme name"
              className="input py-2 text-sm w-56 sm:w-64"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-primary text-sm py-2 px-4 shrink-0 font-semibold shadow-xs"
          >
            Add programme
          </button>
        </div>
      </header>

      {/* Summary Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-ink-muted">Active programmes</p>
          <p className="text-2xl font-bold font-mono text-ink mt-2">
            {programmes.filter((p) => p.status === "active").length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted">Total enrolled students</p>
          <p className="text-2xl font-bold font-mono text-ink mt-2">
            {programmes.reduce((acc, p) => acc + p.activeStudents, 0)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted">Standard credit requirement</p>
          <p className="text-2xl font-bold font-mono text-ink mt-2">
            30 ECTS (800 h)
          </p>
        </div>
      </div>

      {/* Programmes Table Card */}
      <div className="card p-0 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="table border-0 rounded-none">
            <thead>
              <tr>
                <th className="w-20">Code</th>
                <th className="w-1/3">Programme Name</th>
                <th className="w-1/5">Credits / Hours</th>
                <th className="w-1/5">Lead Coordinator</th>
                <th className="w-24">Students</th>
                <th className="w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProgrammes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-ink-muted">
                    No degree programmes found.
                  </td>
                </tr>
              ) : (
                filteredProgrammes.map((prog) => (
                  <tr key={prog.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td>
                      <span className="font-mono font-bold text-sm bg-surface-muted px-2 py-1 rounded border border-border">
                        {prog.code}
                      </span>
                    </td>

                    <td>
                      <p className="font-bold text-ink">{prog.name}</p>
                      <p className="text-xs text-ink-muted">{prog.degreeType}</p>
                    </td>

                    <td>
                      <span className="font-mono tabular font-semibold text-sm">
                        {prog.credits} ECTS
                      </span>
                      <span className="text-xs text-ink-muted ml-1.5">
                        ({prog.requiredHours} h)
                      </span>
                    </td>

                    <td className="text-ink">
                      {prog.leadCoordinator}
                    </td>

                    <td>
                      <span className="font-mono tabular font-semibold text-ink text-sm">
                        {prog.activeStudents}
                      </span>
                    </td>

                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setEditingProg(prog)}
                        className="font-semibold text-brand hover:text-brand-hover text-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Programme Modal */}
      {editingProg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6 shadow-xl animate-fade-in">
            <h2 className="text-lg font-bold text-ink mb-1">
              Edit Programme: {editingProg.code}
            </h2>
            <p className="text-xs text-ink-muted mb-4">
              Update programme guidelines and coordinator.
            </p>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div>
                <label className="field-label">Programme Name</label>
                <input
                  type="text"
                  value={editingProg.name}
                  onChange={(e) =>
                    setEditingProg({ ...editingProg, name: e.target.value })
                  }
                  required
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="field-label">Lead Coordinator</label>
                <input
                  type="text"
                  value={editingProg.leadCoordinator}
                  onChange={(e) =>
                    setEditingProg({ ...editingProg, leadCoordinator: e.target.value })
                  }
                  required
                  className="input text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Credits (ECTS)</label>
                  <input
                    type="number"
                    value={editingProg.credits}
                    onChange={(e) =>
                      setEditingProg({ ...editingProg, credits: Number(e.target.value) })
                    }
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="field-label">Hours Required</label>
                  <input
                    type="number"
                    value={editingProg.requiredHours}
                    onChange={(e) =>
                      setEditingProg({ ...editingProg, requiredHours: Number(e.target.value) })
                    }
                    className="input text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingProg(null)}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm py-2 px-4"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Programme Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6 shadow-xl animate-fade-in">
            <h2 className="text-lg font-bold text-ink mb-1">
              Add degree programme
            </h2>
            <p className="text-xs text-ink-muted mb-4">
              Register a new degree programme and its internship parameters.
            </p>

            <form onSubmit={handleAddProgramme} className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="field-label">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. AUT"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    required
                    className="input text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Programme Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Automotive Engineering"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Degree Type</label>
                <input
                  type="text"
                  value={newDegreeType}
                  onChange={(e) => setNewDegreeType(e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="field-label">Lead Coordinator</label>
                <input
                  type="text"
                  value={newCoordinator}
                  onChange={(e) => setNewCoordinator(e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Credits (ECTS)</label>
                  <input
                    type="number"
                    value={newCredits}
                    onChange={(e) => setNewCredits(Number(e.target.value))}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="field-label">Hours Required</label>
                  <input
                    type="number"
                    value={newHours}
                    onChange={(e) => setNewHours(Number(e.target.value))}
                    className="input text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm py-2 px-4"
                >
                  Create programme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

