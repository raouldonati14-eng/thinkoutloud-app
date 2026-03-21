import React from "react";

import ClassroomControlPanel from "./ClassroomControlPanel";
import LiveQuestionTimer from "./LiveQuestionTimer";
import ClassProgressBar from "./ClassProgressBar";
import AutoAdvancePanel from "./AutoAdvancePanel";

import LiveStudentGrid from "./LiveStudentGrid";
import LiveResponseMap from "./LiveResponseMap";
import LiveTranscriptFeed from "./LiveTranscriptFeed";
import TeacherSpotlightPanel from "./TeacherSpotlightPanel";

export default function LiveClassroomView({ classId }) {

  if (!classId) return null;

  return (
    <div style={styles.container}>

      {/* TOP CONTROL BAR */}

      <div style={styles.controls}>

        <ClassroomControlPanel classId={classId} />

        <LiveQuestionTimer classId={classId} />

        <ClassProgressBar classId={classId} />

        <AutoAdvancePanel classId={classId} />

      </div>

      {/* CLASSROOM GRID */}

      <div style={styles.grid}>

        <div style={styles.panel}>
          <LiveStudentGrid classId={classId} />
        </div>

        <div style={styles.panel}>
          <LiveResponseMap classId={classId} />
        </div>

        <div style={styles.panel}>
          <LiveTranscriptFeed classId={classId} />
        </div>

        <div style={styles.panel}>
          <TeacherSpotlightPanel classId={classId} />
        </div>

      </div>

    </div>
  );
}

const styles = {

  container:{
    marginTop:20
  },

  controls:{
    position:"sticky",
    top:0,
    zIndex:1000,
    background:"#f8f9fb",
    paddingBottom:10
  },

  grid:{
    marginTop:20,
    display:"grid",
    gridTemplateColumns:"1fr 1fr",
    gap:20
  },

  panel:{
    background:"white",
    borderRadius:10,
    padding:10,
    boxShadow:"0 6px 18px rgba(0,0,0,0.08)"
  }

};