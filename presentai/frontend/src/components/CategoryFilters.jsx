import { motion } from 'framer-motion';
import { CATEGORIES } from '../utils/markers';

export const CategoryFilters = ({ activeFilter, onFilterChange }) => {
  const filters = [
    { id: 'all', name: 'All Categories', color: '#6B7280' },
    ...Object.entries(CATEGORIES).map(([id, cat]) => ({
      id,
      name: cat.name,
      color: cat.color,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;

        return (
          <motion.button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`
              relative px-6 py-3 rounded-2xl font-medium text-sm
              transition-all duration-300
              ${isActive 
                ? 'text-white shadow-xl scale-105' 
                : 'glass text-gray-700 border-2 border-white/50 hover:border-white/80 hover:shadow-md'
              }
            `}
            style={isActive ? { 
              background: `linear-gradient(135deg, ${filter.color}ee, ${filter.color})`,
              boxShadow: `0 10px 30px ${filter.color}40`
            } : {}}
            whileHover={{ scale: isActive ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {filter.name}
            
            {isActive && (
              <motion.div
                layoutId="activeFilter"
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${filter.color}ee, ${filter.color})`,
                  boxShadow: `0 0 0 3px ${filter.color}40`,
                }}
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
            
            <span className="relative z-10 drop-shadow-sm">{filter.name}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
