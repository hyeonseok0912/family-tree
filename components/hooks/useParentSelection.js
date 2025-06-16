import { useState, useEffect } from "react";
import { getParentLabel, filterMembersByName } from "../../utils/helpers";

export default function useParentSelection(setFormData, initialParentId = null) {
  const [parentOptions, setParentOptions] = useState([]);
  const [parentNameInput, setParentNameInput] = useState("");
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  useEffect(() => {
    const fetchParents = async () => {
      try {
        const res = await fetch("/api/tablelist?sort=asc");
        const data = await res.json();
        setParentOptions(data);

        if (initialParentId) {
          const selectedParent = data.find((m) => m.id === initialParentId);
          if (selectedParent) {
            setParentNameInput(getParentLabel(selectedParent));
          }
        }
      } catch (err) {
        console.error("부모 목록 불러오기 실패:", err);
      }
    };

    fetchParents();
  }, [initialParentId]);

  const handleParentSelect = (option) => {
    setParentNameInput(getParentLabel(option));
    setFormData((prev) => ({
      ...prev,
      parent_id: option.id,
      generation: option.generation
        ? String(Number(option.generation) + 1)
        : "1",
    }));
    setShowParentDropdown(false);
  };

  return {
    parentNameInput,
    setParentNameInput,
    parentOptions,
    filteredOptions: filterMembersByName(parentOptions, parentNameInput),
    showParentDropdown,
    setShowDropdown: setShowParentDropdown,
    handleParentSelect,
  };
}
