import { useState, useEffect } from "react";
import { getParentLabel, filterMembersByName } from "../../utils/helpers";

export default function useParentSelection(
  setFormData,
  initialParentId = null
) {
  const [parentOptions, setParentOptions] = useState([]);
  const [parentNameInput, setParentNameInput] = useState("");
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  useEffect(() => {
    let active=true;
    const fetchParents = async () => {
      try {
        const res = await fetch("/api/tablelist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort: "asc" }),
        });
        if (!res.ok) throw new Error("부모 목록 조회 실패");
        const data = await res.json();

        if(!active)return;
        setParentOptions(Array.isArray(data) ? data : []);

        if (initialParentId) {
          const selectedParent = Array.isArray(data) && data.find((m) => String(m.id) === String(initialParentId));
          if (selectedParent) {
            setParentNameInput(getParentLabel(selectedParent));
          }
        }
      } catch (err) {
        console.error("부모 목록 불러오기 실패:", err);
      }
    };

    fetchParents();
    return()=>{active=false;};
  }, [initialParentId]);

  const handleParentSelect = (option) => {
    const parentGen = Number(option.generation || 1);
    const childGen = parentGen + 1;
  
    setParentNameInput(getParentLabel(option));
    setFormData((prev) => ({
      ...prev,
      parent_id: option.id,
      rootMember: false,
      mother_nm: '',
      mother_spouse_id: null,
      generation: String(childGen),
    }));
    setShowParentDropdown(false);
  };

  const handleParentInputChange = (event) => {
    setParentNameInput(event.target.value);
    setShowParentDropdown(true);
    setFormData((prev) => ({ ...prev, parent_id: "", generation: "", mother_nm: "", mother_spouse_id:null,rootMember:false }));
  };

  return {
    parentNameInput,
    setParentNameInput,
    parentOptions,
    filteredOptions: filterMembersByName(parentOptions, parentNameInput),
    showParentDropdown,
    setShowDropdown: setShowParentDropdown,
    handleParentSelect,
    handleParentInputChange,
  };
}
