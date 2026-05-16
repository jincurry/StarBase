package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"github.com/jincurry/starbase/internal/config"
	"github.com/jincurry/starbase/internal/db"
)

func main() {
	cmd := "up"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	cfg, err := config.Load()
	if err != nil {
		fail(err)
	}

	src, err := iofs.New(db.MigrationFS, "migrations")
	if err != nil {
		fail(err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", src, cfg.DBURL)
	if err != nil {
		fail(err)
	}

	switch cmd {
	case "up":
		if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			fail(err)
		}
		fmt.Println("migrations applied")
	case "down":
		if err := m.Down(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			fail(err)
		}
		fmt.Println("migrations reverted")
	case "status":
		v, dirty, err := m.Version()
		if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
			fail(err)
		}
		fmt.Printf("version=%d dirty=%v\n", v, dirty)
	default:
		fail(fmt.Errorf("unknown command %q (use up|down|status)", cmd))
	}
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "migrate:", err)
	os.Exit(1)
}
