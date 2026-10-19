import sqlite3
import re
from rdkit import Chem

# Connect to chemlab.db
conn = sqlite3.connect('data/chemlab.db')
cursor = conn.cursor()
cursor.execute('SELECT id, common_name, iupac_name, formula, chemical_class, smiles FROM chemicals ORDER BY id')
chemicals = cursor.fetchall()
conn.close()

elements = {
    'H': '[H][H]', 'He': '[He]', 'Li': '[Li]', 'Be': '[Be]', 'B': '[B]', 'C': '[C]', 'N': 'N#N', 'O': 'O=O',
    'F': 'FF', 'Ne': '[Ne]', 'Na': '[Na]', 'Mg': '[Mg]', 'Al': '[Al]', 'Si': '[Si]', 'P': 'P12P3P1P23', 'S': '[S]',
    'Cl': 'ClCl', 'Ar': '[Ar]', 'K': '[K]', 'Ca': '[Ca]', 'Sc': '[Sc]', 'Ti': '[Ti]', 'V': '[V]', 'Cr': '[Cr]',
    'Mn': '[Mn]', 'Fe': '[Fe]', 'Co': '[Co]', 'Ni': '[Ni]', 'Cu': '[Cu]', 'Zn': '[Zn]', 'Ga': '[Ga]', 'Ge': '[Ge]',
    'As': '[As]', 'Se': '[Se]', 'Br': 'BrBr', 'Kr': '[Kr]', 'Rb': '[Rb]', 'Sr': '[Sr]', 'Y': '[Y]', 'Zr': '[Zr]',
    'Nb': '[Nb]', 'Mo': '[Mo]', 'Ag': '[Ag]', 'Cd': '[Cd]', 'In': '[In]', 'Sn': '[Sn]', 'Sb': '[Sb]', 'I': 'II',
    'Xe': '[Xe]', 'Cs': '[Cs]', 'Ba': '[Ba]', 'Pt': '[Pt]', 'Au': '[Au]', 'Pb': '[Pb]', 'Bi': '[Bi]', 'W': '[W]',
    'Hg': '[Hg]'
}

cations_map = {
    'Na': ('[Na+]', 1), 'K': ('[K+]', 1), 'Li': ('[Li+]', 1), 'Cs': ('[Cs+]', 1), 'Rb': ('[Rb+]', 1),
    'Ag': ('[Ag+]', 1), 'NH4': ('[NH4+]', 1),
    'Ca': ('[Ca+2]', 2), 'Ba': ('[Ba+2]', 2), 'Mg': ('[Mg+2]', 2), 'Sr': ('[Sr+2]', 2),
    'Cu': ('[Cu+2]', 2), 'Zn': ('[Zn+2]', 2), 'Pb': ('[Pb+2]', 2), 'Cd': ('[Cd+2]', 2),
    'Fe': ('[Fe+2]', 2), 'Ni': ('[Ni+2]', 2), 'Co': ('[Co+2]', 2), 'Mn': ('[Mn+2]', 2),
    'Sn': ('[Sn+2]', 2), 'Be': ('[Be+2]', 2), 'Hg': ('[Hg+2]', 2),
    'Al': ('[Al+3]', 3), 'Cr': ('[Cr+3]', 3), 'Bi': ('[Bi+3]', 3), 'Sb': ('[Sb+3]', 3),
    'Eu': ('[Eu+3]', 3), 'Gd': ('[Gd+3]', 3),
    'Ti': ('[Ti+4]', 4), 'Zr': ('[Zr+4]', 4)
}

anions_map = {
    'SO4': ('[O-]S(=O)(=O)[O-]', 2),
    'SO3': ('[O-]S(=O)[O-]', 2),
    'HSO4': ('OS(=O)(=O)[O-]', 1),
    'HSO3': ('OS(=O)[O-]', 1),
    'S2O3': ('[O-]S(=O)(=S)[O-]', 2),
    'S2O8': ('[O-]S(=O)(=O)OOS(=O)(=O)[O-]', 2),
    'NO3': ('[O-][N+](=O)[O-]', 1),
    'NO2': ('[O-]N=O', 1),
    'CO3': ('[O-]C(=O)[O-]', 2),
    'HCO3': ('OC(=O)[O-]', 1),
    'PO4': ('[O-]P(=O)([O-])[O-]', 3),
    'HPO4': ('OP(=O)([O-])[O-]', 2),
    'H2PO4': ('OP(=O)(O)[O-]', 1),
    'CrO4': ('[O-][Cr](=O)(=O)[O-]', 2),
    'Cr2O7': ('[O-][Cr](=O)(=O)O[Cr](=O)(=O)[O-]', 2),
    'MnO4': ('[O-][Mn](=O)(=O)=O', 1),
    'ClO4': ('[O-][Cl](=O)(=O)=O', 1),
    'ClO3': ('[O-][Cl](=O)=O', 1),
    'ClO2': ('[O-][Cl]=O', 1),
    'ClO': ('[O-]Cl', 1),
    'BrO3': ('[O-][Br](=O)=O', 1),
    'IO4': ('[O-][I](=O)(=O)=O', 1),
    'IO3': ('[O-][I](=O)=O', 1),
    'SCN': ('[S-]C#N', 1),
    'CN': ('[C-]#N', 1),
    'BO2': ('[O-]B=O', 1),
    'PF6': ('F[P-](F)(F)(F)(F)F', 1),
    'BF4': ('F[B-](F)(F)F', 1),
    'OH': ('[OH-]', 1),
    'Cl': ('[Cl-]', 1),
    'Br': ('[Br-]', 1),
    'I': ('[I-]', 1),
    'F': ('[F-]', 1),
    'S': ('[S-2]', 2),
    'O': ('[O-2]', 2),
}

CURATED_SMILES = {
    # 1. Organics & Acids & Esters & Aromatics & Sugars
    "acetic-acid": "CC(=O)O",
    "ch3cooh": "CC(=O)O",
    "acetic-anhydride": "CC(=O)OC(=O)C",
    "adipoyl-chloride": "O=C(Cl)CCCCC(=O)Cl",
    "aspirin": "CC(=O)Oc1ccccc1C(=O)O",
    "c9h8o4": "CC(=O)Oc1ccccc1C(=O)O",
    "brch2ch2oh": "OCCBr",
    "c10h22": "CCCCCCCCCC",
    "c10h8": "c1ccc2ccccc2c1",
    "c12h22o11": "OCC1OC(OC2(CO)OC(CO)C(O)C2O)C(O)C(O)C1O",
    "sucrose": "OCC1OC(OC2(CO)OC(CO)C(O)C2O)C(O)C(O)C1O",
    "c12h26": "CCCCCCCCCCCC",
    "c14h10": "c1ccc2cc3ccccc3cc2c1",
    "c16h34": "CCCCCCCCCCCCCCCC",
    "c2h3clo2": "ClCC(=O)O",
    "c2h5cooh": "CCC(=O)O",
    "c2h5oh": "CCO",
    "c2h6o2": "OCCO",
    "c2hf3o2": "FC(F)(F)C(=O)O",
    "c3h4o4": "O=C(O)CC(=O)O",
    "malonic-acid": "O=C(O)CC(=O)O",
    "c3h6o": "CC(=O)C",
    "c3h6o2": "CCOC=O",
    "c3h6o3": "CC(O)C(=O)O",
    "c3h7cooh": "CCCC(=O)O",
    "c3h7oh": "CCCO",
    "c3h8": "CCC",
    "propane": "CCC",
    "c3h8o3": "OCC(O)CO",
    "c4h10": "CCCC",
    "c4h10o": "CCCCO",
    "c4h10o2": "OCCOCC",
    "c4h4o6na2": "[Na+].[Na+].[O-]C(=O)C(O)C(O)C(=O)[O-]",
    "c4h6o4": "O=C(O)CCC(=O)O",
    "c4h6o6": "O=C(O)C(O)C(O)C(=O)O",
    "c4h8": "CCC=C",
    "c4h8o": "CCC(C)=O",
    "c4h8o2": "CCOC(=O)C",
    "c4h8o2_diox": "C1COCCO1",
    "c4h8o_ald": "CCCC=O",
    "c4h8o_mek": "CCC(C)=O",
    "c4h8o_thf": "C1CCOC1",
    "c4h9cooh": "CCCCC(=O)O",
    "c4h9oh": "CCCCO",
    "c5h10": "C1CCCC1",
    "c5h10o": "CCC(=O)CC",
    "c5h10o2": "CCCCOC=O",
    "c5h12": "CCCCC",
    "c5h12o": "CCCCCO",
    "c5h12o_iso": "CC(C)CCO",
    "c5h5n": "c1ccncc1",
    "c5h6o2": "O=C1OC=CC1",
    "c5h8o": "O=C1CCCC1",
    "c6h10": "C1CCC=CC1",
    "c6h10o": "O=C1CCCCC1",
    "c6h10o4": "O=C(O)CCCCC(=O)O",
    "c6h11nao7": "[Na+].OCC(O)C(O)C(O)C(O)C(=O)[O-]",
    "sodium-gluconate": "[Na+].OCC(O)C(O)C(O)C(O)C(=O)[O-]",
    "c6h12": "C1CCCCC1",
    "c6h12o": "OC1CCCCC1",
    "c6h12o2": "CCCCOC(=O)C",
    "c6h12o6": "OCC1OC(O)C(O)C(O)C1O",
    "glucose": "OCC1OC(O)C(O)C(O)C1O",
    "c6h14": "CCCCCC",
    "c6h14o": "CCCCCCO",
    "c6h16n2": "NCCCCCCN",
    "hexamethylenediamine": "NCCCCCCN",
    "c6h5cl": "Clc1ccccc1",
    "c6h5cooh": "O=C(O)c1ccccc1",
    "c6h5cook": "[K+].O=C([O-])c1ccccc1",
    "c6h5coona": "[Na+].O=C([O-])c1ccccc1",
    "c6h5nh2": "Nc1ccccc1",
    "c6h5no2": "O=[N+]([O-])c1ccccc1",
    "c6h5oh": "Oc1ccccc1",
    "c6h6o": "Oc1ccccc1",
    "c6h5o7na3": "[Na+].[Na+].[Na+].[O-]C(=O)CC(O)(C(=O)[O-])CC(=O)[O-]",
    "na3c6h5o7": "[Na+].[Na+].[Na+].[O-]C(=O)CC(O)(C(=O)[O-])CC(=O)[O-]",
    "c6h6": "c1ccccc1",
    "c6h7n": "Nc1ccccc1",
    "c6h8o7": "O=C(O)CC(O)(C(=O)O)CC(=O)O",
    "citric-acid": "O=C(O)CC(O)(C(=O)O)CC(=O)O",
    "c7h14o2": "CC(=O)OCCC(C)C",
    "c7h16": "CCCCCCC",
    "c7h5o3na": "[Na+].O=C([O-])c1ccccc1O",
    "c7h6o": "O=Cc1ccccc1",
    "c7h6o2": "O=C(O)c1ccccc1",
    "benzoic-acid": "O=C(O)c1ccccc1",
    "c7h6o3": "O=C(O)c1ccccc1O",
    "salicylic-acid": "O=C(O)c1ccccc1O",
    "c7h8": "Cc1ccccc1",
    "c7h8o": "OCc1ccccc1",
    "c8h10": "CCc1ccccc1",
    "c8h10_xyl": "Cc1ccccc1C",
    "c8h14n4nio4": "CC(=N[O-])C(=NO)C.[Ni+2].CC(=N[O-])C(=NO)C",
    "c8h18": "CCCCCCCC",
    "c8h8": "C=Cc1ccccc1",
    "c8h8o2": "COC(=O)c1ccccc1",
    "c8h8o3": "COC(=O)c1ccccc1O",
    "c9h10o2": "CCOC(=O)c1ccccc1",
    "c9h20": "CCCCCCCCC",
    "c2f3o2na": "[Na+].FC(F)(F)C(=O)[O-]",
    "c2h2clo2na": "[Na+].ClCC(=O)[O-]",
    "c2h3n": "CC#N",
    "c2h4br2": "BrCCBr",
    "c2h4cl2": "ClCCCl",
    "c2h4o2_est": "COC=O",
    "c2h5br": "CCBr",
    "c2h5cl": "CCCl",
    "c2h5i": "CCI",
    "c2h5nh2": "CCN",
    "c2h6o_ether": "COC",
    "c2h6s": "CCS",
    "c2h7n": "CNC",
    "c2h8n2": "NCCN",
    "c3h4": "CC#C",
    "c3h5o3na": "[Na+].CC(O)C(=O)[O-]",
    "c3h6": "CC=C",
    "c4h9coona": "[Na+].CCCCC(=O)[O-]",
    "ch2o": "C=O",
    "hcho": "C=O",
    "ch2o2": "O=CO",
    "formic-acid": "O=CO",
    "hcooh": "O=CO",
    "ch2cl2": "ClCCl",
    "ch3br": "CBr",
    "ch3cho": "CC=O",
    "ch3cl": "CCl",
    "ch3coch3": "CC(=O)C",
    "ch3cooch3": "COC(=O)C",
    "ch3cooc2h5": "CCOC(=O)C",
    "ch3i": "CI",
    "chi3": "IC(I)I",
    "ch3nh2": "CN",
    "ch3no2": "C[N+](=O)[O-]",
    "ch3oh": "CO",
    "ch4": "C",
    "ch4n2o": "NC(=O)N",
    "urea": "NC(=O)N",
    "chcl3": "ClC(Cl)Cl",
    "ccl4": "ClC(Cl)(Cl)Cl",
    "c2h2": "C#C",
    "c2h4": "C=C",
    "c2h6": "CC",
    "cs2": "S=C=S",
    "hcn": "C#N",
    "iodoacetone": "CC(=O)CI",
    "nylon66": "O=C1CCCCC(=O)NCCCCCCN1",
    "nylon_66": "O=C1CCCCC(=O)NCCCCCCN1",
    "c5h6o2": "CC1=CC(=O)OC1",

    # 2. Special Inorganics, Hydrides, Nonmetals
    "ammonia": "N",
    "water": "O",
    "biocl": "[Bi+3].[O-2].[Cl-]",
    "ca-clo-2": "[Ca+2].[O-]Cl.[O-]Cl",
    "cac2": "[Ca+2].[C-]#[C-]",
    "cro2cl2": "O=[Cr](=O)(Cl)Cl",
    "cah2": "[Ca+2].[H-].[H-]",
    "fe-nh4-2-so4-2": "[NH4+].[NH4+].[Fe+2].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]",
    "kh": "[K+].[H-]",
    "lih": "[Li+].[H-]",
    "nah": "[Na+].[H-]",
    "nabh4": "[Na+].[BH4-]",
    "lialh4": "[Li+].[AlH4-]",
    "knh2": "[K+].[NH2-]",
    "nanh2": "[Na+].[NH2-]",
    "nan3": "[Na+].[N-]=[N+]=[N-]",
    "nahs": "[Na+].[SH-]",
    "nah2po2": "[Na+].O=[PH2][O-]",
    "nabo2": "[Na+].[O-]B=O",
    "na2b4o7": "[Na+].[Na+].[O-]B1OB2OB([O-])OB(O1)O2",
    "na2s2o4": "[Na+].[Na+].[O-]S(=O)S(=O)[O-]",
    "na2s2o5": "[Na+].[Na+].[O-]S(=O)S(=O)(=O)[O-]",
    "kbf4": "[K+].F[B-](F)(F)F",
    "nabf4": "[Na+].F[B-](F)(F)F",
    "hbf4": "[H+].F[B-](F)(F)F",
    "h3no": "NO",
    "nh2oh-hcl": "[Cl-].[NH3+]O",
    "n2h4": "NN",
    "mg3n2": "[Mg+2].[Mg+2].[Mg+2].[N-3].[N-3]",
    "pcl3": "ClP(Cl)Cl",
    "pcl5": "ClP(Cl)(Cl)(Cl)Cl",
    "sicl4": "Cl[Si](Cl)(Cl)Cl",
    "socl2": "O=S(Cl)Cl",
    "as2s3": "S=[As]S[As]=S",
    "h2": "[H][H]",
    "o2": "O=O",
    "n2": "N#N",
    "cl2": "ClCl",
    "br2": "BrBr",
    "i2": "II",
    "f2": "FF",
    "p4": "P12P3P1P23",
    "h2s": "S",
    "hscn": "SC#N",
    "h2seo4": "O[Se](=O)(=O)O",
    "h2so3": "OS(=O)O",
    "h2so4": "OS(=O)(=O)O",
    "h3aso4": "O[As](=O)(O)O",
    "h3bo3": "OB(O)O",
    "h3po4": "OP(=O)(O)O",
    "hbr": "Br",
    "hbro": "OBr",
    "hcl": "Cl",
    "hclo": "OCl",
    "hclo2": "O=ClO",
    "hclo3": "O=Cl(=O)O",
    "hclo4": "O=Cl(=O)(=O)O",
    "hf": "F",
    "hi": "I",
    "hio3": "O=I(=O)O",
    "hno2": "ON=O",
    "hno3": "O=[N+]([O-])O",
    "hg": "[Hg]",
    "hgcl2": "Cl[Hg]Cl",
    "hg2cl2": "Cl[Hg][Hg]Cl",
    "hgi2": "I[Hg]I",
    "hgs": "[Hg+2].[S-2]",

    # 3. Coordination Complexes & Complex Inorganic Salts
    "ag-nh3-2-cl": "[Cl-].[NH3][Ag+][NH3]",
    "ag-nh3-2-no3": "[O-][N+](=O)[O-].[NH3][Ag+][NH3]",
    "co-h2o-6-cl2": "[Cl-].[Cl-].[Co+2].O.O.O.O.O.O",
    "cu-nh3-4-oh2": "[OH-].[OH-].[Cu+2]([NH3])([NH3])([NH3])[NH3]",
    "cu-nh3-4-so4": "[Cu+2]([NH3])([NH3])([NH3])[NH3].[O-]S(=O)(=O)[O-]",
    "na3-ag-s2o3-2": "[Na+].[Na+].[Na+].[O-]S(=O)(=S)O[Ag-3]OS(=O)(=S)[O-]",
    "fe3-fe-cn-6-2": "[Fe+2].[Fe+2].[Fe+2].[Fe-3]([C-]#N)([C-]#N)([C-]#N)([C-]#N)([C-]#N)[C-]#N.[Fe-3]([C-]#N)([C-]#N)([C-]#N)([C-]#N)([C-]#N)[C-]#N",
    "fe4-fe-cn-6-3": "[Fe+3].[Fe+3].[Fe+3].[Fe+3].[Fe-4]([C-]#N)([C-]#N)([C-]#N)([C-]#N)([C-]#N)[C-]#N.[Fe-4]([C-]#N)([C-]#N)([C-]#N)([C-]#N)([C-]#N)[C-]#N.[Fe-4]([C-]#N)([C-]#N)([C-]#N)([C-]#N)([C-]#N)[C-]#N",
    "k4-fe-cn-6": "[K+].[K+].[K+].[K+].[Fe-4]([C-]#N)([C-]#N)([C-]#N)([C-]#N)([C-]#N)[C-]#N",
    "k3-fe-cn-6": "[K+].[K+].[K+].[Fe-3]([C-]#N)([C-]#N)([C-]#N)([C-]#N)([C-]#N)[C-]#N",
    "k2-ni-cn-4": "[K+].[K+].[Ni-2]([C-]#N)([C-]#N)([C-]#N)[C-]#N",
    "k2-co-scn-4": "[K+].[K+].[Co+2].[S-]C#N.[S-]C#N.[S-]C#N.[S-]C#N",
    "k3-fe-scn-6": "[K+].[K+].[K+].[Fe+3].[S-]C#N.[S-]C#N.[S-]C#N.[S-]C#N.[S-]C#N.[S-]C#N",
    "c3h6o2_est": "COC(=O)C",
    "c3h6o2_etf": "CCOC=O",
    "c3h6o_ald": "CCC=O",
    "c3h7cook": "[K+].CCCC(=O)[O-]",
    "c3h7coona": "[Na+].CCCC(=O)[O-]",
    "c3h8o": "CCCO",
    "c3h8o_iso": "CC(C)O",
    "c3h9n": "CN(C)C",
    "c4h10o_ether": "CCOCC",
    "c4h10o_sec": "CCC(C)O",
    "c4h10o_tert": "CC(C)(C)O",
    "c4h4s": "c1ccsc1",
    "c4h6": "CCC#C",
    "c4h6o3": "CC(=O)OC(=O)C",
    "na-ag-cn-2": "[Na+].[C-]#[N+][Ag-][N+]#[C-]",
    "na-au-cn-2": "[Na+].[C-]#[N+][Au-][N+]#[C-]",
    "na-cr-oh-4": "[Na+].[Cr-](O)(O)(O)O",
    "na-sn-oh-3": "[Na+].[Sn-](O)(O)O",
    "na2-pb-oh-4": "[Na+].[Na+].[Pb-2](O)(O)(O)O",
    "na-al-oh-4": "[Na+].[Al-](O)(O)(O)O",
    "na2-zn-oh-4": "[Na+].[Na+].[Zn-2](O)(O)(O)O",
    "pt-nh3-2-cl2": "Cl[Pt](Cl)([NH3])[NH3]",
    "co-nh3-6-cl3": "[Co+3]([NH3])([NH3])([NH3])([NH3])([NH3])[NH3].[Cl-].[Cl-].[Cl-]",
    "ni-nh3-6-cl2": "[Cl-].[Cl-].[Ni+2]([NH3])([NH3])([NH3])([NH3])([NH3])[NH3]",
    "zn-nh3-4-so4": "[Zn+2]([NH3])([NH3])([NH3])[NH3].[O-]S(=O)(=O)[O-]",
    "k-fe-cl4": "[K+].Cl[Fe-](Cl)(Cl)Cl",
    "k2-co-cl4": "[K+].[K+].Cl[Co-2](Cl)(Cl)Cl",
    "k2-cu-cl4": "[K+].[K+].Cl[Cu-2](Cl)(Cl)Cl",
    "can": "[NH4+].[NH4+].[Ce+4].[O-][N+](=O)[O-].[O-][N+](=O)[O-].[O-][N+](=O)[O-].[O-][N+](=O)[O-].[O-][N+](=O)[O-].[O-][N+](=O)[O-]",

    # 4. Oxalates
    "h2c2o4": "O=C(O)C(=O)O",
    "ag2c2o4": "[Ag+].[Ag+].[O-]C(=O)C(=O)[O-]",
    "bac2o4": "[Ba+2].[O-]C(=O)C(=O)[O-]",
    "cac2o4": "[Ca+2].[O-]C(=O)C(=O)[O-]",
    "cuc2o4": "[Cu+2].[O-]C(=O)C(=O)[O-]",
    "fec2o4": "[Fe+2].[O-]C(=O)C(=O)[O-]",
    "k2c2o4": "[K+].[K+].[O-]C(=O)C(=O)[O-]",
    "na2c2o4": "[Na+].[Na+].[O-]C(=O)C(=O)[O-]",
    "pbc2o4": "[Pb+2].[O-]C(=O)C(=O)[O-]",
    "znc2o4": "[Zn+2].[O-]C(=O)C(=O)[O-]",
    "nh4-2-c2o4": "[NH4+].[NH4+].[O-]C(=O)C(=O)[O-]",

    # 5. Acetates & Formates
    "ammonium-acetate": "[NH4+].CC(=O)[O-]",
    "sodium-acetate": "[Na+].CC(=O)[O-]",
    "ch3coona": "[Na+].CC(=O)[O-]",
    "ch3cook": "[K+].CC(=O)[O-]",
    "ch3cooli": "[Li+].CC(=O)[O-]",
    "ch3coo-2-ba": "[Ba+2].CC(=O)[O-].CC(=O)[O-]",
    "ch3coo-2-ca": "[Ca+2].CC(=O)[O-].CC(=O)[O-]",
    "ch3coo-2-cu": "[Cu+2].CC(=O)[O-].CC(=O)[O-]",
    "ch3coo-2-fe": "[Fe+2].CC(=O)[O-].CC(=O)[O-]",
    "ch3coo-3-fe": "[Fe+3].CC(=O)[O-].CC(=O)[O-].CC(=O)[O-]",
    "ch3coo-2-mg": "[Mg+2].CC(=O)[O-].CC(=O)[O-]",
    "ch3coo-2-mn": "[Mn+2].CC(=O)[O-].CC(=O)[O-]",
    "ch3coo-2-ni": "[Ni+2].CC(=O)[O-].CC(=O)[O-]",
    "ch3coo-2-pb": "[Pb+2].CC(=O)[O-].CC(=O)[O-]",
    "ch3coo-2-zn": "[Zn+2].CC(=O)[O-].CC(=O)[O-]",
    "hcoo-2-ba": "[Ba+2].O=C[O-].O=C[O-]",
    "hcoo-2-ca": "[Ca+2].O=C[O-].O=C[O-]",
    "hcoona": "[Na+].O=C[O-]",
    "hcook": "[K+].O=C[O-]",
    "hcoonh4": "[NH4+].O=C[O-]",

    # 6. Bicarbonates
    "ba-hco3-2": "[Ba+2].OC(=O)[O-].OC(=O)[O-]",
    "ca-hco3-2": "[Ca+2].OC(=O)[O-].OC(=O)[O-]",
    "mg-hco3-2": "[Mg+2].OC(=O)[O-].OC(=O)[O-]",
    "sr-hco3-2": "[Sr+2].OC(=O)[O-].OC(=O)[O-]",
    "fe-hco3-2": "[Fe+2].OC(=O)[O-].OC(=O)[O-]",
    "nahco3": "[Na+].OC(=O)[O-]",
    "khco3": "[K+].OC(=O)[O-]",
    "nh4hco3": "[NH4+].OC(=O)[O-]",

    # 7. Oxides, Phosphorus Oxides, Polyacids
    "p4o10": "O=P12OP(=O)3OP(=O)(O1)OP(=O)(O2)O3",
    "p4o6": "O1P2OP3OP1OP(O2)O3",
    "h4p2o7": "O=P(O)(O)OP(=O)(O)O",
    "h2s2o7": "O=S(=O)(O)OS(=O)(=O)O",
    "v2o5": "O=[V](=O)O[V](=O)=O",
    "cro3": "O=[Cr](=O)=O",
    "mn2o7": "O=[Mn](=O)(=O)O[Mn](=O)(=O)=O",
    "n2o4": "O=[N+]([O-])[N+](=O)[O-]",
    "n2o5": "O=[N+]([O-])O[N+](=O)[O-]",
    "n2o3": "O=NON=O",
    "n2o": "[N-]=[N+]=O",
    "no2": "[O-][N+]=O",
    "no": "[N]=O",
    "no3": "[O-][N+](=O)[O-]",
    "so2": "O=S=O",
    "so3": "O=S(=O)=O",
    "co": "[C-]#[O+]",
    "co2": "O=C=O",
    "sio2": "O=[Si]=O",
    "b2o3": "O=BOB=O",
    "h2o2": "OO",
    "na2o2": "[Na+].[Na+].[O-][O-]",
    "ba-o2": "[Ba+2].[O-][O-]",
    "k2s2o8": "[K+].[K+].[O-]S(=O)(=O)OOS(=O)(=O)[O-]",
    "(nh4)2s2o8": "[NH4+].[NH4+].[O-]S(=O)(=O)OOS(=O)(=O)[O-]",
    "na2s2o8": "[Na+].[Na+].[O-]S(=O)(=O)OOS(=O)(=O)[O-]",
    "na2s2o3": "[Na+].[Na+].[O-]S(=O)(=S)[O-]",
    "k2s2o3": "[K+].[K+].[O-]S(=O)(=S)[O-]",
    "(nh4)2s2o3": "[NH4+].[NH4+].[O-]S(=O)(=S)[O-]",
    "ba-s2o3": "[Ba+2].[O-]S(=O)(=S)[O-]",
    "kcr-so4-2": "[K+].[Cr+3].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]",
    "nh4fe-so4-2": "[NH4+].[Fe+3].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]",
    "kfe-so4-2": "[K+].[Fe+3].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]",
    "kal-so4-2": "[K+].[Al+3].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]",
    "ti-so4-2": "[Ti+4].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]",

    # Hydrates with water dots
    "cuso4-5h2o": "[Cu+2].[O-]S(=O)(=O)[O-].O.O.O.O.O",
    "feso4-7h2o": "[Fe+2].[O-]S(=O)(=O)[O-].O.O.O.O.O.O.O",
    "mgso4-7h2o": "[Mg+2].[O-]S(=O)(=O)[O-].O.O.O.O.O.O.O",
    "znso4-7h2o": "[Zn+2].[O-]S(=O)(=O)[O-].O.O.O.O.O.O.O",
    "bacl2-2h2o": "[Ba+2].[Cl-].[Cl-].O.O",
    "cacl2-2h2o": "[Ca+2].[Cl-].[Cl-].O.O",
    "na2co3-10h2o": "[Na+].[Na+].[O-]C(=O)[O-].O.O.O.O.O.O.O.O.O.O",
    "fe-no3-3-9h2o": "[Fe+3].[O-][N+](=O)[O-].[O-][N+](=O)[O-].[O-][N+](=O)[O-].O.O.O.O.O.O.O.O.O",
    "alcl3-6h2o": "[Al+3].[Cl-].[Cl-].[Cl-].O.O.O.O.O.O",
    "fecl3-6h2o": "[Fe+3].[Cl-].[Cl-].[Cl-].O.O.O.O.O.O",
    "cocl2-6h2o": "[Co+2].[Cl-].[Cl-].O.O.O.O.O.O",
    "nicl2-6h2o": "[Ni+2].[Cl-].[Cl-].O.O.O.O.O.O",
}

def resolve_salt(formula, name=''):
    f = formula.replace('(', '').replace(')', '').strip()
    h_count = 0
    if '.' in formula or '·' in formula:
        parts = re.split(r'[.·]', formula)
        f = parts[0].replace('(', '').replace(')', '').strip()
        m = re.search(r'(\d*)H2O', parts[1])
        h_count = int(m.group(1)) if m and m.group(1) else 1

    for cat_name, (cat_smiles, cat_val) in sorted(cations_map.items(), key=lambda x: -len(x[0])):
        if f.startswith(cat_name):
            rem = f[len(cat_name):]
            m_cnt = re.match(r'^(\d+)', rem)
            cat_cnt = 1
            if m_cnt:
                cat_cnt = int(m_cnt.group(1))
                rem = rem[len(m_cnt.group(1)):]
            
            actual_cat_smiles = cat_smiles
            actual_cat_val = cat_val
            if 'iron(iii)' in name.lower() or 'ferric' in name.lower() or 'fe(no3)3' in formula.lower() or 'fecl3' in formula.lower():
                actual_cat_smiles = '[Fe+3]'
                actual_cat_val = 3
            elif 'copper(i)' in name.lower() or 'cuprous' in name.lower() or 'cu2o' in formula.lower() or 'cucl' == formula.lower():
                actual_cat_smiles = '[Cu+]'
                actual_cat_val = 1
            elif 'tin(iv)' in name.lower() or 'stannic' in name.lower() or 'sncl4' in formula.lower() or 'sno2' in formula.lower():
                actual_cat_smiles = '[Sn+4]'
                actual_cat_val = 4
            elif 'lead(iv)' in name.lower() or 'pbo2' in formula.lower():
                actual_cat_smiles = '[Pb+4]'
                actual_cat_val = 4
            elif 'mercury(i)' in name.lower():
                actual_cat_smiles = '[Hg+]'
                actual_cat_val = 1
            
            for an_name, (an_smiles, an_val) in sorted(anions_map.items(), key=lambda x: -len(x[0])):
                if rem.startswith(an_name):
                    an_rem = rem[len(an_name):]
                    an_cnt = int(an_rem) if an_rem.isdigit() else 1
                    
                    total_cat_charge = cat_cnt * actual_cat_val
                    total_an_charge = an_cnt * an_val
                    if total_cat_charge != total_an_charge:
                        if cat_cnt > 0 and total_an_charge % cat_cnt == 0:
                            new_val = total_an_charge // cat_cnt
                            elem = actual_cat_smiles.strip('[]+0123456789-')
                            actual_cat_smiles = f'[{elem}+{new_val}]' if new_val > 1 else f'[{elem}+]'
                    
                    smiles_parts = [actual_cat_smiles] * cat_cnt + [an_smiles] * an_cnt + ['O'] * h_count
                    return '.'.join(smiles_parts)
    return None

resolved_map = {}
unmatched = []

for cid, name, iname, formula, cls, cur_smiles in chemicals:
    sm = None
    if cid in CURATED_SMILES:
        sm = CURATED_SMILES[cid]
    elif formula in elements:
        sm = elements[formula]
    else:
        sm = resolve_salt(formula, name)
    
    if sm:
        # Validate with RDKit
        try:
            m = Chem.MolFromSmiles(sm)
            if m is not None:
                resolved_map[cid] = sm
            else:
                unmatched.append((cid, name, formula, f"RDKit parse failed for: {sm}"))
        except Exception as e:
            unmatched.append((cid, name, formula, str(e)))
    else:
        unmatched.append((cid, name, formula, "No rule matched"))

print(f"\n==========================================")
print(f"RESULTS: {len(resolved_map)} / {len(chemicals)} chemicals successfully mapped to valid SMILES!")
print(f"Unmatched: {len(unmatched)}")
if unmatched:
    for u in unmatched:
        print(f"  FAILED: {u[0]:20s} | {u[2]:16s} | {u[3]} | {u[1]}")
print(f"==========================================\n")
