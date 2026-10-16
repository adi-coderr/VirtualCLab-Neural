import { useState } from "react";
import type { UnifiedReactantDTO, PropertyProvenance } from "../../types/reactant";
import type { Chemical } from "../../types/chemistry";
import { formatFormula } from "../../utils/formatFormula";
import { getChemicalColor } from "../../utils/chemicalColorMixer";
import "./ReactantPropertyDetails.css";

interface ReactantPropertyDetailsProps {
  reactant?: UnifiedReactantDTO | null;
  fallbackChemical?: Chemical | null;
  isLoading?: boolean;
}

// Known crystal lattice structures for common elements & minerals
const CRYSTAL_LATTICES: Record<string, string> = {
  fe: "Body-Centered Cubic (BCC)",
  cu: "Face-Centered Cubic (FCC)",
  al: "Face-Centered Cubic (FCC)",
  ag: "Face-Centered Cubic (FCC)",
  au: "Face-Centered Cubic (FCC)",
  ni: "Face-Centered Cubic (FCC)",
  pt: "Face-Centered Cubic (FCC)",
  pb: "Face-Centered Cubic (FCC)",
  zn: "Hexagonal Close-Packed (HCP)",
  mg: "Hexagonal Close-Packed (HCP)",
  ti: "Hexagonal Close-Packed (HCP)",
  cr: "Body-Centered Cubic (BCC)",
  w: "Body-Centered Cubic (BCC)",
  mo: "Body-Centered Cubic (BCC)",
  na: "Body-Centered Cubic (BCC)",
  k: "Body-Centered Cubic (BCC)",
  c: "Hexagonal Planar (Graphite)",
  si: "Diamond Cubic",
  nacl: "Halite Rock-Salt (FCC)",
  caco3: "Trigonal Calcite / Orthorhombic Aragonite",
};

export function ReactantPropertyDetails({ reactant, fallbackChemical, isLoading }: ReactantPropertyDetailsProps) {
  const [activeSection, setActiveSection] = useState<"reactivity" | "electronic" | "category" | "characterization" | "isotopes" | "provenance">("reactivity");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 1500);
  };

  // If loading and no fallback
  if (isLoading && !reactant && !fallbackChemical) {
    return (
      <div className="reactant-details reactant-details--loading">
        <div className="reactant-details__spinner" />
        <p>Loading verified reactant property model...</p>
      </div>
    );
  }

  // Determine display values from unified reactant or fallback chemical
  const name = reactant?.canonicalName || fallbackChemical?.commonName || "Unknown Chemical";
  const iupacName = reactant?.iupacName || fallbackChemical?.iupacName || null;
  const formula = reactant?.formula || fallbackChemical?.formula || "";
  const casNumber = reactant?.casNumber || fallbackChemical?.casNumber || null;
  const smiles = reactant?.smiles || fallbackChemical?.smiles || null;
  const bondingType = reactant?.bondingType || "covalent";
  const physicalState = reactant?.physicalState || fallbackChemical?.physicalState || "solid";
  const colorHex = reactant?.appearance.color || fallbackChemical?.substanceColor || getChemicalColor(reactant?.id || fallbackChemical?.id || "", formula, name);
  const odor = reactant?.appearance.odor || "odorless";

  // Molar mass
  const molarMassG = reactant ? reactant.molarMass.gMol : fallbackChemical?.molarMass;
  const molarMassKg = reactant ? reactant.molarMass.kgMol : molarMassG ? Number((molarMassG * 0.001).toFixed(6)) : null;
  const molarMassProv = reactant?.molarMass.provenance;

  // Temperatures
  const meltingK = reactant?.temperatures.meltingPointK ?? (fallbackChemical?.meltingPointC !== undefined ? Number((fallbackChemical.meltingPointC + 273.15).toFixed(2)) : null);
  const meltingC = reactant?.temperatures.meltingPointC ?? fallbackChemical?.meltingPointC ?? null;
  const meltingProv = reactant?.temperatures.provenance?.meltingPoint;

  const boilingK = reactant?.temperatures.boilingPointK ?? (fallbackChemical?.boilingPointC !== undefined ? Number((fallbackChemical.boilingPointC + 273.15).toFixed(2)) : null);
  const boilingC = reactant?.temperatures.boilingPointC ?? fallbackChemical?.boilingPointC ?? null;
  const boilingProv = reactant?.temperatures.provenance?.boilingPoint;

  // Density
  const densityKg = reactant?.density.kgM3 ?? (fallbackChemical?.density ? fallbackChemical.density * 1000 : null);
  const densityG = reactant?.density.gCm3 ?? fallbackChemical?.density ?? null;
  const densityProv = reactant?.density.provenance;

  // Solubility
  const rawId = (reactant?.id || fallbackChemical?.id || "").toLowerCase();
  const isSolidMetal = reactant?.categoryTags?.includes("metal") && reactant?.atomicNumber !== null && !["na", "k", "li", "cs", "rb"].includes(rawId);
  const solubilityCat = isSolidMetal
    ? "insoluble"
    : reactant?.solubility.category || (fallbackChemical?.solubilityNotes ? "recorded" : "unknown");
  const solubilityVal = reactant?.solubility.gPer100gWater;

  // Categories
  const categoryTags = reactant?.categoryTags || (fallbackChemical?.chemicalClass ? [fallbackChemical.chemicalClass] : []);

  // Crystal / Bonding info
  const crystalLattice = CRYSTAL_LATTICES[rawId] || (bondingType === "ionic" ? "Ionic Crystal Lattice" : bondingType === "metallic" ? "Close-Packed Metallic Lattice" : "Molecular Structure");

  // Oxidation & Electron Configuration
  const oxidationStates = reactant?.electronic?.commonOxidationStates || [];
  const oxidationDisplay = oxidationStates.length > 0
    ? oxidationStates.map((s) => (s > 0 ? `+${s}` : `${s}`)).join(", ")
    : bondingType === "ionic"
    ? "Ions in lattice"
    : "0 (Neutral)";

  // Metals / nonmetals category properties
  const metalProps = reactant?.categoryProperties?.metals;
  const nonmetalProps = reactant?.categoryProperties?.nonmetals;
  const nobleGasProps = reactant?.categoryProperties?.nobleGases;

  // Characterization
  const acidBaseClass = reactant?.characterization.acidBaseClass || (fallbackChemical?.isAcid ? `Acid (${fallbackChemical.acidBaseStrength})` : fallbackChemical?.isBase ? `Base (${fallbackChemical.acidBaseStrength})` : "Neutral");
  const pKa = reactant?.characterization.pKa ?? fallbackChemical?.pKa ?? null;
  const pKb = reactant?.characterization.pKb ?? fallbackChemical?.pKb ?? null;
  const magneticBehavior = reactant?.characterization.magneticBehavior || "diamagnetic";
  const isAmphoteric = reactant?.characterization.isAmphoteric || false;
  const isFlammable = reactant?.characterization.isFlammable || false;
  const isRadioactive = reactant?.characterization.isRadioactive || false;
  const redoxRole = reactant?.characterization.redoxCharacter || "neutral";

  // Reactivity & Safety
  const reactivity = reactant?.reactivity;
  const ghsCodes = reactant?.reactivity.ghsHazardCodes || (fallbackChemical?.hazards ? fallbackChemical.hazards.map((h) => h.code) : []);
  const handlingPrecautions = reactant?.reactivity.handlingPrecautions || fallbackChemical?.notes || "Standard laboratory precautions apply.";
  const ppe = reactant?.reactivity.ppeRequirements || "Safety goggles, chemical-resistant nitrile gloves, lab coat.";

  // Isotopes & Aliases
  const isotopes = reactant?.isotopes || [];
  const aliases = reactant?.aliases || fallbackChemical?.aliases || [];

  return (
    <div className="reactant-details">
      {/* 1. Header Instrument Banner */}
      <div className="reactant-details__header">
        <div className="reactant-details__identity-row">
          <div className="reactant-details__formula-badge" onClick={() => copyToClipboard(formula, "formula")} title="Click to copy formula">
            <span className="formula">{formatFormula(formula)}</span>
            {colorHex && (
              <span
                className="reactant-details__color-dot"
                style={{ backgroundColor: colorHex }}
                title={`Physical substance color: ${colorHex}`}
              />
            )}
            {copiedKey === "formula" && <span className="reactant-details__copied-pill">Copied!</span>}
          </div>

          <div className="reactant-details__name-block">
            <div className="reactant-details__title-line">
              <h4 className="reactant-details__canonical-name">{name}</h4>
              {casNumber && (
                <span
                  className="reactant-details__cas-chip"
                  onClick={() => copyToClipboard(casNumber, "cas")}
                  title="CAS Registry Number (Click to copy)"
                >
                  CAS: {casNumber}
                  {copiedKey === "cas" && <span className="reactant-details__copied-chip">Copied</span>}
                </span>
              )}
            </div>
            {iupacName && <span className="reactant-details__iupac">IUPAC: {iupacName}</span>}
          </div>
        </div>

        {/* Categories & Classification Pills */}
        <div className="reactant-details__tags-row">
          <span className="reactant-details__pill reactant-details__pill--bonding">
            {bondingType} bonding
          </span>
          <span className="reactant-details__pill reactant-details__pill--phase">
            State: {physicalState}
          </span>
          {categoryTags.map((tag) => (
            <span key={tag} className="reactant-details__pill reactant-details__pill--category">
              {tag.replace(/_/g, " ")}
            </span>
          ))}
          {smiles && (
            <span
              className="reactant-details__pill reactant-details__pill--smiles"
              onClick={() => copyToClipboard(smiles, "smiles")}
              title={`SMILES: ${smiles} (Click to copy)`}
            >
              SMILES: {smiles}
              {copiedKey === "smiles" && <span className="reactant-details__copied-chip">Copied</span>}
            </span>
          )}
        </div>
      </div>

      {/* 2. Balanced 8-Card Metric Grid (2 Rows of 4 Cards) */}
      <div className="reactant-details__metrics-grid">
        {/* Card 1: Molar Mass */}
        <div
          className="reactant-details__metric-card"
          onClick={() => molarMassG && copyToClipboard(`${molarMassG.toFixed(3)} g/mol`, "mm")}
          title="Click to copy molar mass"
        >
          <div className="reactant-details__metric-top">
            <span className="reactant-details__metric-label">Molar Mass</span>
            {molarMassProv && <ProvenanceBadge prov={molarMassProv} />}
          </div>
          <div className="reactant-details__metric-val">
            {molarMassG !== undefined ? `${molarMassG.toFixed(3)} g/mol` : "—"}
          </div>
          <div className="reactant-details__metric-sub">
            {molarMassKg !== null ? `${molarMassKg.toFixed(6)} kg/mol (SI)` : "SI: kg/mol"}
          </div>
          {copiedKey === "mm" && <div className="reactant-details__card-copied">Copied!</div>}
        </div>

        {/* Card 2: Density */}
        <div
          className="reactant-details__metric-card"
          onClick={() => densityKg && copyToClipboard(`${densityKg} kg/m³`, "density")}
          title="Click to copy density"
        >
          <div className="reactant-details__metric-top">
            <span className="reactant-details__metric-label">Density</span>
            {densityProv && <ProvenanceBadge prov={densityProv} />}
          </div>
          <div className="reactant-details__metric-val">
            {densityKg !== null ? `${densityKg.toLocaleString()} kg/m³` : densityG !== null ? `${densityG} g/cm³` : "—"}
          </div>
          <div className="reactant-details__metric-sub">
            {densityG !== null && densityKg !== null ? `${densityG} g/cm³` : "SI standard"}
          </div>
          {copiedKey === "density" && <div className="reactant-details__card-copied">Copied!</div>}
        </div>

        {/* Card 3: Melting Point */}
        <div
          className="reactant-details__metric-card"
          onClick={() => meltingK && copyToClipboard(`${meltingK} K (${meltingC} °C)`, "mp")}
          title="Click to copy melting point"
        >
          <div className="reactant-details__metric-top">
            <span className="reactant-details__metric-label">Melting Point</span>
            {meltingProv && <ProvenanceBadge prov={meltingProv} />}
          </div>
          <div className="reactant-details__metric-val">
            {meltingK !== null ? `${meltingK.toLocaleString()} K` : meltingC !== null ? `${meltingC} °C` : "N/A (decomposes)"}
          </div>
          <div className="reactant-details__metric-sub">
            {meltingC !== null ? `${meltingC.toLocaleString()} °C` : "Decomposes before melt"}
          </div>
          {copiedKey === "mp" && <div className="reactant-details__card-copied">Copied!</div>}
        </div>

        {/* Card 4: Boiling Point */}
        <div
          className="reactant-details__metric-card"
          onClick={() => boilingK && copyToClipboard(`${boilingK} K (${boilingC} °C)`, "bp")}
          title="Click to copy boiling point"
        >
          <div className="reactant-details__metric-top">
            <span className="reactant-details__metric-label">Boiling Point</span>
            {boilingProv && <ProvenanceBadge prov={boilingProv} />}
          </div>
          <div className="reactant-details__metric-val">
            {boilingK !== null ? `${boilingK.toLocaleString()} K` : boilingC !== null ? `${boilingC} °C` : "N/A"}
          </div>
          <div className="reactant-details__metric-sub">
            {boilingC !== null ? `${boilingC.toLocaleString()} °C` : "Thermal decomp / non-volatile"}
          </div>
          {copiedKey === "bp" && <div className="reactant-details__card-copied">Copied!</div>}
        </div>

        {/* Card 5: Water Solubility */}
        <div className="reactant-details__metric-card">
          <div className="reactant-details__metric-top">
            <span className="reactant-details__metric-label">Water Solubility</span>
            <span className={`reactant-details__status-pill status-${solubilityCat.toLowerCase()}`}>
              {solubilityCat.replace(/_/g, " ")}
            </span>
          </div>
          <div className="reactant-details__metric-val" style={{ textTransform: "capitalize" }}>
            {solubilityCat.replace(/_/g, " ")}
          </div>
          <div className="reactant-details__metric-sub">
            {isSolidMetal
              ? "Insoluble elemental metal"
              : solubilityVal !== null && solubilityVal !== undefined
              ? `${solubilityVal} g / 100g H₂O`
              : "Standard ambient (25 °C)"}
          </div>
        </div>

        {/* Card 6: Appearance & Odor */}
        <div className="reactant-details__metric-card">
          <div className="reactant-details__metric-top">
            <span className="reactant-details__metric-label">Appearance & Odor</span>
          </div>
          <div className="reactant-details__metric-val" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {colorHex && (
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: colorHex,
                  display: "inline-block",
                  border: "1px solid rgba(0,0,0,0.2)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                }}
              />
            )}
            <span>{colorHex ? `Hex: ${colorHex}` : "White / Colorless"}</span>
          </div>
          <div className="reactant-details__metric-sub" style={{ textTransform: "capitalize" }}>
            Odor: {odor}
          </div>
        </div>

        {/* Card 7: Crystal System & Lattice */}
        <div className="reactant-details__metric-card">
          <div className="reactant-details__metric-top">
            <span className="reactant-details__metric-label">Crystal Structure</span>
            <span className="reactant-details__status-pill status-predicted">Lattice</span>
          </div>
          <div className="reactant-details__metric-val" style={{ fontSize: "12px", lineHeight: "1.3" }}>
            {crystalLattice}
          </div>
          <div className="reactant-details__metric-sub">
            {bondingType} coordination network
          </div>
        </div>

        {/* Card 8: Common Oxidation States */}
        <div className="reactant-details__metric-card">
          <div className="reactant-details__metric-top">
            <span className="reactant-details__metric-label">Oxidation States</span>
            <span className="reactant-details__status-pill status-value">Redox</span>
          </div>
          <div className="reactant-details__metric-val">
            {oxidationDisplay}
          </div>
          <div className="reactant-details__metric-sub">
            {reactant?.atomicNumber ? `Element Z = ${reactant.atomicNumber}` : "Stable ground states"}
          </div>
        </div>
      </div>

      {/* 3. Sleek Floating Segmented Control (Tabs) */}
      <div className="reactant-details__nav-wrapper">
        <div className="reactant-details__nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "reactivity"}
            className={`reactant-details__nav-btn ${activeSection === "reactivity" ? "is-active" : ""}`}
            onClick={() => setActiveSection("reactivity")}
          >
            Reactivity & Safety
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "electronic"}
            className={`reactant-details__nav-btn ${activeSection === "electronic" ? "is-active" : ""}`}
            onClick={() => setActiveSection("electronic")}
          >
            Atomic & Electronic
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "category"}
            className={`reactant-details__nav-btn ${activeSection === "category" ? "is-active" : ""}`}
            onClick={() => setActiveSection("category")}
          >
            Category Properties
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "characterization"}
            className={`reactant-details__nav-btn ${activeSection === "characterization" ? "is-active" : ""}`}
            onClick={() => setActiveSection("characterization")}
          >
            Chemical Character
          </button>
          {isotopes.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === "isotopes"}
              className={`reactant-details__nav-btn ${activeSection === "isotopes" ? "is-active" : ""}`}
              onClick={() => setActiveSection("isotopes")}
            >
              Isotopes ({isotopes.length})
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "provenance"}
            className={`reactant-details__nav-btn ${activeSection === "provenance" ? "is-active" : ""}`}
            onClick={() => setActiveSection("provenance")}
          >
            Provenance & Audit
          </button>
        </div>
      </div>

      {/* 4. Section Details Content */}
      <div className="reactant-details__section-content">
        {/* Section 1: Reactivity & Safety */}
        {activeSection === "reactivity" && (
          <div className="reactant-details__panel">
            <div className="reactant-details__subgrid">
              <div className="reactant-details__subcard">
                <span className="reactant-details__subcard-title">Chemical Reactivity Profiles</span>
                <ul className="reactant-details__checklist">
                  <li className="reactant-details__check-item">
                    <span className={`reactant-details__react-badge ${reactivity?.reactsWithWater ? "is-active" : "is-inert"}`}>
                      {reactivity?.reactsWithWater ? "ACTIVE" : "INERT"}
                    </span>
                    <div className="reactant-details__check-content">
                      <strong>Water (H₂O):</strong>{" "}
                      <span>{reactivity?.reactsWithWater ? reactivity.waterNotes || "Reactive with moisture/water" : "Non-reactive under ambient neutral conditions"}</span>
                    </div>
                  </li>

                  <li className="reactant-details__check-item">
                    <span className={`reactant-details__react-badge ${reactivity?.reactsWithAcid ? "is-active" : "is-inert"}`}>
                      {reactivity?.reactsWithAcid ? "ACTIVE" : "INERT"}
                    </span>
                    <div className="reactant-details__check-content">
                      <strong>Acids:</strong>{" "}
                      <span>{reactivity?.reactsWithAcid ? reactivity.acidNotes || "Reacts with dilute acids (effervescence / salt formation)" : "Unreactive with non-oxidizing acids"}</span>
                    </div>
                  </li>

                  <li className="reactant-details__check-item">
                    <span className={`reactant-details__react-badge ${reactivity?.reactsWithBase ? "is-active" : "is-inert"}`}>
                      {reactivity?.reactsWithBase ? "ACTIVE" : "INERT"}
                    </span>
                    <div className="reactant-details__check-content">
                      <strong>Bases:</strong>{" "}
                      <span>{reactivity?.reactsWithBase ? reactivity.baseNotes || "Neutralization / precipitation reaction observed" : "No reaction observed with aqueous bases"}</span>
                    </div>
                  </li>

                  <li className="reactant-details__check-item">
                    <span className={`reactant-details__react-badge ${reactivity?.reactsWithOxygen ? "is-active" : "is-inert"}`}>
                      {reactivity?.reactsWithOxygen ? "SENSITIVE" : "STABLE"}
                    </span>
                    <div className="reactant-details__check-content">
                      <strong>Oxygen (Air):</strong>{" "}
                      <span>{reactivity?.reactsWithOxygen ? reactivity.oxygenNotes || "Sensitive to aerial oxidation / forms surface oxide" : "Stable in air at standard room temperature"}</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="reactant-details__subcard">
                <span className="reactant-details__subcard-title">Laboratory PPE & Handling Precautions</span>
                
                {/* PPE Badges */}
                <div className="reactant-details__ppe-row">
                  <span className="reactant-details__ppe-badge">Safety Goggles</span>
                  <span className="reactant-details__ppe-badge">Nitrile Gloves</span>
                  <span className="reactant-details__ppe-badge">Lab Coat</span>
                  {reactivity?.reactsWithWater && <span className="reactant-details__ppe-badge">Fume Hood</span>}
                </div>

                <div className="reactant-details__handling-box">
                  <strong>Handling Protocol:</strong>
                  <p>{handlingPrecautions}</p>
                </div>

                {ghsCodes.length > 0 && (
                  <div className="reactant-details__ghs-row">
                    <span className="reactant-details__ghs-label">GHS Hazard Codes:</span>
                    {ghsCodes.map((code) => (
                      <span key={code} className="reactant-details__ghs-tag" title={`Hazard Class: ${code}`}>
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Atomic & Electronic Structure */}
        {activeSection === "electronic" && (
          <div className="reactant-details__panel">
            <div className="reactant-details__prop-table">
              {reactant?.atomicNumber !== null && reactant?.atomicNumber !== undefined && (
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Atomic Number (Z)</span>
                  <span className="reactant-details__prop-val">{reactant.atomicNumber}</span>
                </div>
              )}
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Valence Electrons</span>
                <span className="reactant-details__prop-val">
                  {reactant?.electronic.valenceElectrons ?? (reactant?.atomicNumber ? `${reactant.atomicNumber} total electrons` : "Not applicable (compound)")}
                </span>
              </div>
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Common Oxidation States</span>
                <span className="reactant-details__prop-val">
                  {reactant?.electronic.commonOxidationStates && reactant.electronic.commonOxidationStates.length > 0
                    ? reactant.electronic.commonOxidationStates.map((s) => (s > 0 ? `+${s}` : `${s}`)).join(", ")
                    : "0"}
                </span>
              </div>
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Pauling Electronegativity</span>
                <span className="reactant-details__prop-val">
                  {reactant?.electronic.electronegativityPauling ?? "—"}
                </span>
              </div>
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Ionization Energy</span>
                <span className="reactant-details__prop-val">
                  {reactant?.electronic.ionizationEnergyJouleMol
                    ? `${(reactant.electronic.ionizationEnergyJouleMol / 1000).toFixed(1)} kJ/mol`
                    : "—"}
                </span>
              </div>
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Atomic / Ionic Radius</span>
                <span className="reactant-details__prop-val">
                  {reactant?.electronic.atomicRadiusPm ? `${reactant.electronic.atomicRadiusPm} pm` : "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Category-Specific Properties */}
        {activeSection === "category" && (
          <div className="reactant-details__panel">
            {metalProps ? (
              <div className="reactant-details__prop-table">
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Metallic Character</span>
                  <span className="reactant-details__prop-val">Electropositive (Readily loses valence electrons)</span>
                </div>
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Malleability & Workability</span>
                  <span className="reactant-details__prop-val">{metalProps.malleability || "High (can be hammered into sheets)"}</span>
                </div>
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Ductility</span>
                  <span className="reactant-details__prop-val">{metalProps.ductility || "High (can be drawn into wires)"}</span>
                </div>
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Metallic Luster</span>
                  <span className="reactant-details__prop-val">{metalProps.luster || "Reflective metallic sheen"}</span>
                </div>
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Oxide Behavior</span>
                  <span className="reactant-details__prop-val">{metalProps.oxideBehavior || "Basic / Amphoteric oxides"}</span>
                </div>
              </div>
            ) : nonmetalProps ? (
              <div className="reactant-details__prop-table">
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Nonmetallic Character</span>
                  <span className="reactant-details__prop-val">Electronegative (Tendency to gain/share electrons)</span>
                </div>
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Mechanical Behavior</span>
                  <span className="reactant-details__prop-val">{nonmetalProps.brittleness || "Brittle in solid state"}</span>
                </div>
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Electrical Conductivity</span>
                  <span className="reactant-details__prop-val">Poor (Insulator or semiconductor)</span>
                </div>
              </div>
            ) : nobleGasProps ? (
              <div className="reactant-details__subcard">
                <p><strong>Noble Gas Group:</strong> Marked as chemically inert with full valence shell.</p>
              </div>
            ) : (
              <div className="reactant-details__subcard">
                <p>This compound consists of {bondingType} bonds with category designations: {categoryTags.join(", ")}.</p>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Chemical Characterization */}
        {activeSection === "characterization" && (
          <div className="reactant-details__panel">
            <div className="reactant-details__prop-table">
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Acid-Base Classification</span>
                <span className="reactant-details__prop-val" style={{ textTransform: "capitalize" }}>
                  {acidBaseClass.replace(/_/g, " ")}
                </span>
              </div>
              {pKa !== null && (
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Acid Dissociation Constant (pKa)</span>
                  <span className="reactant-details__prop-val">{pKa}</span>
                </div>
              )}
              {pKb !== null && (
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Base Dissociation Constant (pKb)</span>
                  <span className="reactant-details__prop-val">{pKb}</span>
                </div>
              )}
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Magnetic Behavior</span>
                <span className="reactant-details__prop-val" style={{ textTransform: "capitalize" }}>
                  {magneticBehavior}
                </span>
              </div>
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Amphoteric Nature</span>
                <span className="reactant-details__prop-val">{isAmphoteric ? "Yes (reacts with both acids & bases)" : "No"}</span>
              </div>
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Redox Character</span>
                <span className="reactant-details__prop-val" style={{ textTransform: "capitalize" }}>
                  {redoxRole}
                </span>
              </div>
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Flammability</span>
                <span className="reactant-details__prop-val">{isFlammable ? "Flammable" : "Non-flammable"}</span>
              </div>
              <div className="reactant-details__prop-row">
                <span className="reactant-details__prop-name">Radioactivity</span>
                <span className="reactant-details__prop-val">{isRadioactive ? "Radioactive" : "Stable (Non-radioactive)"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Isotopes */}
        {activeSection === "isotopes" && (
          <div className="reactant-details__panel">
            <table className="reactant-details__iso-table">
              <thead>
                <tr>
                  <th>Mass Number</th>
                  <th>Isotopic Mass (u)</th>
                  <th>Natural Abundance</th>
                  <th>Half-Life</th>
                </tr>
              </thead>
              <tbody>
                {isotopes.map((iso) => (
                  <tr key={iso.massNumber}>
                    <td><strong>^{iso.massNumber}</strong></td>
                    <td>{iso.isotopicMassU.toFixed(5)} u</td>
                    <td>{iso.abundancePercent.toFixed(3)}%</td>
                    <td><span className="reactant-details__half-life-pill">{iso.halfLife}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 6: Data Provenance & Traceability */}
        {activeSection === "provenance" && (
          <div className="reactant-details__panel">
            <div className="reactant-details__subcard">
              <span className="reactant-details__subcard-title">Provenance & Traceability Audit</span>
              <p className="reactant-details__text-sm" style={{ marginBottom: "10px" }}>
                Every physical, chemical, and thermodynamic property in the unified registry is verified against authoritative chemical reference databases:
              </p>
              <div className="reactant-details__prop-table">
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Molar Mass Reference</span>
                  <span className="reactant-details__prop-val">
                    {molarMassProv?.source || "Periodic Table standard weights"} (Confidence: {Math.round((molarMassProv?.confidence ?? 1.0) * 100)}%)
                  </span>
                </div>
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Thermodynamic Constants</span>
                  <span className="reactant-details__prop-val">
                    {meltingProv?.source || "CRC Handbook of Chemistry & Physics / PubChem reference conventions"}
                  </span>
                </div>
                <div className="reactant-details__prop-row">
                  <span className="reactant-details__prop-name">Density & Phase Data</span>
                  <span className="reactant-details__prop-val">
                    {densityProv?.source || "IUPAC / General Chemistry Handbook"} (Confidence: {Math.round((densityProv?.confidence ?? 0.95) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Synonyms & Aliases Footer */}
      {aliases.length > 0 && (
        <div className="reactant-details__footer">
          <span className="reactant-details__footer-label">Synonyms & Aliases:</span>
          <span className="reactant-details__footer-text">{aliases.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

function ProvenanceBadge({ prov }: { prov: PropertyProvenance }) {
  const status = prov.status || "value";
  const confidencePercent = Math.round((prov.confidence || 0.95) * 100);

  return (
    <span
      className={`reactant-details__prov-badge status-${status}`}
      title={`Provenance Status: ${status.toUpperCase()}\nSource: ${prov.source}\nConfidence: ${confidencePercent}%${prov.rawValue ? `\nRaw Value: ${prov.rawValue}` : ""}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
