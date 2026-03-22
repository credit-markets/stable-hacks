"use client";

import { PaginationNav } from "@/components/PaginationNav";
import { MarketplacePoolCard } from "@/components/pools/MarketplacePoolCard";
import {
  ContentReveal,
  StaggerItem,
  StaggerReveal,
} from "@/components/ui/skeletons";
import { styles } from "@/lib/styleClasses";
import type { PoolsResponse } from "@/types/pools";
import "keen-slider/keen-slider.min.css";
import { useKeenSlider } from "keen-slider/react";
import { useState } from "react";

type Props = {
  opportunities: PoolsResponse;
  fetch: {
    next: () => void;
    prev: () => void;
    pageNumber: number;
    pageSize: number;
    hasMore: boolean;
  };
};

export function OpportunitiesGrid({ opportunities, fetch }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [opportunitiesSliderRef, sliderInstance] = useKeenSlider({
    slides: {
      perView: 1,
      spacing: 16,
    },
    mode: "snap",
    loop: true,
    initial: 0,
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
  });

  return (
    <>
      <div className="block md:hidden">
        <div
          ref={opportunitiesSliderRef}
          key={"mobile-opportunities"}
          className="keen-slider"
        >
          {opportunities.data.map((opportunity) => (
            <div
              key={`${opportunity.id}-mobile`}
              className="keen-slider__slide"
            >
              <ContentReveal variant="fade-up">
                <MarketplacePoolCard pool={opportunity} />
              </ContentReveal>
            </div>
          ))}
        </div>
        {/* Slide dots + swipe hint */}
        {loaded && opportunities.data.length > 1 && (
          <div className="flex flex-col items-center gap-2 mt-3">
            <div className="flex gap-1.5">
              {opportunities.data.map((opp, idx) => (
                <button
                  key={opp.id}
                  type="button"
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    idx === currentSlide
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-text-muted/30"
                  }`}
                  onClick={() => sliderInstance.current?.moveToIdx(idx)}
                />
              ))}
            </div>
            {currentSlide === 0 && (
              <span className="text-[10px] text-text-muted">
                Swipe to explore more pools
              </span>
            )}
          </div>
        )}
      </div>

      <StaggerReveal
        key={"desktop-opportunities"}
        className={`hidden md:grid ${styles.gridPools}`}
      >
        {opportunities.data.map((opportunity) => (
          <StaggerItem key={`${opportunity.id}-desktop`}>
            <MarketplacePoolCard pool={opportunity} />
          </StaggerItem>
        ))}
      </StaggerReveal>

      <PaginationNav
        page={fetch.pageNumber}
        pageSize={fetch.pageSize}
        total={opportunities.pagination.total}
        onPageChange={(newPage) => {
          if (newPage > fetch.pageNumber) fetch.next();
          else fetch.prev();
        }}
        itemText="pools"
      />
    </>
  );
}
